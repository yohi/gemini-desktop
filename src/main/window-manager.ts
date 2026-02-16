import { BrowserWindow, WebContentsView, Session } from 'electron';
import { getSession, getUserAgent } from './session-manager';
import path from 'path'; // Import path

// Map of userId -> WebContentsView
const views = new Map<string, WebContentsView>();
let mainWindow: BrowserWindow | null = null;
let currentActiveUserId: string | null = null;
let splitViewUserId: string | null = null; // If set, split view is active

export function initWindowManager(win: BrowserWindow) {
  mainWindow = win;

  // Resize handler
  mainWindow.on('resize', () => {
    updateLayout();
  });
}

export function getOrCreateView(userId: string): WebContentsView {
  if (!userId || !userId.trim()) {
    throw new Error('Invalid userId: cannot be empty or whitespace-only');
  }

  if (views.has(userId)) {
    return views.get(userId)!;
  }

  let userSession: Session;
  try {
    userSession = getSession(userId);
  } catch (error) {
    throw new Error(`Failed to get session for user ${userId}: ${(error as Error).message}`);
  }

  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('DEBUG: WebContentsView preload path:', preloadPath);

  const view = new WebContentsView({
    webPreferences: {
      session: userSession,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true, // Revert to true as it is required for proper security and might be checked
      preload: preloadPath, // Inject preload script for spoofing
    }
  });

  // Force pure Chrome User-Agent to prevent Google login blocks
  // Do NOT use string replacement on Electron's default UA as it leaves traces.
  view.webContents.setUserAgent(getUserAgent());

  // --- MANUAL PRELOAD INJECTION ---
  // If preload.js doesn't run, execute spoofing manually on every frame navigation.
  const spoofingCode = `
    (() => {
      try {
        if (window.__spoofed) return;
        window.__spoofed = true;

        // 1. Remove navigator.webdriver
        const newProto = Object.getPrototypeOf(navigator);
        if (newProto && Object.prototype.hasOwnProperty.call(newProto, 'webdriver')) {
          delete newProto.webdriver;
        } else {
          delete navigator.webdriver;
        }
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

        // 2. Mock plugins
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        
        // 3. Mock languages
        Object.defineProperty(navigator, 'languages', { get: () => ['ja', 'en-US', 'en'] });

        // 4. Mock window.chrome (Edge needs it)
        if (!window.chrome) {
          const chromeObj = { 
            app: { 
              isInstalled: false,
              InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
              RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
            }, 
            runtime: { 
              OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
              OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
              PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
              PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
              PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
              RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
              connect: () => ({ postMessage: () => {}, onMessage: { addListener: () => {} }, onDisconnect: { addListener: () => {} } }),
              sendMessage: () => {},
              id: 'mhjfbmdgcfjbbpaeojofohoefgiehjai'
            }, 
            loadTimes: () => {}, 
            csi: () => {} 
          };
          Object.defineProperty(window, 'chrome', { value: chromeObj, writable: true });
        }
        
        // 5. Hide cdc_
        const deleteAutomation = (obj) => {
          for (const key in obj) {
            if (key.match(/^cdc_[a-z0-9]+$/ig) || key.match(/__\\$webdriverAsyncExecutor/g)) {
              delete obj[key];
            }
          }
        };
        deleteAutomation(window);
        deleteAutomation(document);

        console.log('--- CDP SPOOF EXECUTED ---');
      } catch (e) {
        console.error('Spoof error:', e);
      }
    })();
  `;

  // Use CDP (Chrome DevTools Protocol) to inject script on new document
  // This is much more reliable than executeJavaScript on events
  try {
    // Attach debugger if not already attached
    if (!view.webContents.debugger.isAttached()) {
        view.webContents.debugger.attach('1.3');
    }
    
    view.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
      source: spoofingCode
    });
    
    console.log('DEBUG: Attached CDP and added spoofing script');
  } catch (err) {
    console.error('Debugger attach/command failed:', err);
  }

  // Load default URL
  view.webContents.openDevTools({ mode: 'detach' });
  view.webContents.loadURL('https://gemini.google.com');

    views.set(userId, view);
    return view;
}

export function switchUser(userId: string) {
  if (!mainWindow) return;

  // Clear split view if active
  splitViewUserId = null;
  currentActiveUserId = userId;

  updateLayout();
}

export function enableSplitView(primaryId: string, secondaryId: string) {
  currentActiveUserId = primaryId;
  splitViewUserId = secondaryId;

  updateLayout();
}

export function isMainWindow(wc: Electron.WebContents): boolean {
  return mainWindow?.webContents === wc;
}

export function getUserIdFromWebContents(wc: Electron.WebContents): string | undefined {
  for (const [userId, view] of views.entries()) {
    if (view.webContents === wc) {
      return userId;
    }
  }
  return undefined;
}

function updateLayout() {
  if (!mainWindow) return;
  // Use _bounds to avoid unused variable error if we keep it, or just remove it.
  const contentBounds = mainWindow.getContentBounds();

  // Sidebar width - must match the CSS width of the sidebar
  const sidebarWidth = 250;
  const contentWidth = Math.max(0, contentBounds.width - sidebarWidth);
  const height = contentBounds.height;

  // Detach all managed views first
  views.forEach(v => {
      try {
        // Cast to any to access View methods if not in type definition
        const contentView = (mainWindow as any).contentView;
        if (contentView) {
             contentView.removeChildView(v);
        }
      } catch (e) {
          // Ignore
      }
  });

  const contentView = (mainWindow as any).contentView;

  if (currentActiveUserId && !splitViewUserId) {
      const v = getOrCreateView(currentActiveUserId);
      if (contentView) {
          contentView.addChildView(v);
      }
      v.setBounds({ x: sidebarWidth, y: 0, width: contentWidth, height: height });
  } else if (currentActiveUserId && splitViewUserId) {
      const v1 = getOrCreateView(currentActiveUserId);
      const v2 = getOrCreateView(splitViewUserId);

      if (contentView) {
          contentView.addChildView(v1);
          contentView.addChildView(v2);
      }

      const halfWidth = Math.floor(contentWidth / 2);
      v1.setBounds({ x: sidebarWidth, y: 0, width: halfWidth, height: height });
      v2.setBounds({ x: sidebarWidth + halfWidth, y: 0, width: contentWidth - halfWidth, height: height });
  }
}

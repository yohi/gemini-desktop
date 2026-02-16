import { contextBridge, ipcRenderer } from 'electron';

console.log('--- PRELOAD SCRIPT INJECTED ---');

// --- Advanced Stealth & Spoofing ---

const spoofNavigator = () => {
  try {
    // 1. Remove navigator.webdriver from prototype (More effective than simple override)
    const newProto = Object.getPrototypeOf(navigator);
    if (newProto && Object.prototype.hasOwnProperty.call(newProto, 'webdriver')) {
      delete (newProto as any).webdriver;
    } else {
      // Try deleting from instance if not on prototype
      // @ts-ignore
      delete navigator.webdriver;
    }
    
    // Also define it as undefined just in case
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    });

    // 2. Spoof navigator.plugins with realistic data
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        // Mimic Chrome PDF Plugin
        const plugin1 = {
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer',
          description: 'Portable Document Format',
        };
        const plugin2 = {
          name: 'Chrome PDF Viewer',
          filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
          description: '',
        };
        const plugins = [plugin1, plugin2];
        // Add array-like methods
        (plugins as any).item = (index: number) => plugins[index];
        (plugins as any).namedItem = (name: string) => plugins.find(p => p.name === name);
        (plugins as any).refresh = () => {};
        return plugins;
      },
    });

    // 3. Spoof languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ja', 'en-US', 'en'],
    });

    // 4. Inject window.chrome object
    // Essential for passing as a real Chrome browser
    if (!(window as any).chrome) {
      const chromeObj = {
        app: {
          isInstalled: false,
          InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed',
          },
          RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running',
          },
        },
        runtime: {
          OnInstalledReason: {
            CHROME_UPDATE: 'chrome_update',
            INSTALL: 'install',
            SHARED_MODULE_UPDATE: 'shared_module_update',
            UPDATE: 'update',
          },
          OnRestartRequiredReason: {
            APP_UPDATE: 'app_update',
            OS_UPDATE: 'os_update',
            PERIODIC: 'periodic',
          },
          PlatformArch: {
            ARM: 'arm',
            ARM64: 'arm64',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64',
          },
          PlatformNaclArch: {
            ARM: 'arm',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64',
          },
          PlatformOs: {
            ANDROID: 'android',
            CROS: 'cros',
            LINUX: 'linux',
            MAC: 'mac',
            OPENBSD: 'openbsd',
            WIN: 'win',
          },
          RequestUpdateCheckStatus: {
            NO_UPDATE: 'no_update',
            THROTTLED: 'throttled',
            UPDATE_AVAILABLE: 'update_available',
          },
        },
        loadTimes: () => {},
        csi: () => {},
      };
      
      Object.defineProperty(window, 'chrome', {
        writable: true,
        enumerable: true,
        configurable: false,
        value: chromeObj,
      });
    }

    // 5. Spoof Permissions API
    // Ensure query doesn't reveal automation behavior
    if (window.navigator.permissions) {
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission as any, kind: 'permission', name: 'notifications' } as any) :
          originalQuery(parameters)
      );
    }

    // 6. Hide Automation/CDC properties
    // Delete potential Selenium/Puppeteer detection triggers
    const windowAny = window as any;
    const documentAny = document as any;

    const deleteAutomationProperties = (obj: any) => {
      try {
        if (!obj) return;
        for (const key of Object.keys(obj)) {
          if (key.match(/^cdc_[a-z0-9]+$/ig) || key.match(/__\$webdriverAsyncExecutor/g)) {
            delete obj[key];
          }
        }
      } catch (e) {
        // ignore errors during property deletion
      }
    };

    deleteAutomationProperties(windowAny);
    deleteAutomationProperties(documentAny);

  } catch (e) {
    console.error('Failed to spoof properties', e);
  }
};

// Apply spoofing immediately
spoofNavigator();

// --- Existing IPC Configuration ---

contextBridge.exposeInMainWorld('electronAPI', {
  getUsers: () => ipcRenderer.invoke('get-users'),
  addUser: (name: string) => ipcRenderer.invoke('add-user', name),
  switchUser: (userId: string) => ipcRenderer.invoke('switch-user', userId),
  toggleSplit: (primaryId: string, secondaryId: string) => ipcRenderer.invoke('toggle-split', primaryId, secondaryId),
  removeUser: (userId: string) => ipcRenderer.invoke('remove-user', userId),
  clearSessionData: (userId: string) => ipcRenderer.invoke('clear-session-data', userId),
  // Auth API
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getToken: () => ipcRenderer.invoke('auth:get-token'),
  onAuthSuccess: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('auth:success', listener);
    return () => ipcRenderer.removeListener('auth:success', listener);
  },
  onAuthError: (callback: (err: string) => void) => {
    const listener = (_: any, err: string) => callback(err);
    ipcRenderer.on('auth:error', listener);
    return () => ipcRenderer.removeListener('auth:error', listener);
  },
});

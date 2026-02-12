import { BrowserWindow, WebContentsView } from 'electron';
import { getSession } from './session-manager';

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

  let userSession;
  try {
    userSession = getSession(userId);
  } catch (error) {
    throw new Error(`Failed to get session for user ${userId}: ${(error as Error).message}`);
  }

  const view = new WebContentsView({
    webPreferences: {
      session: userSession,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    }
  });

    // Load default URL
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
        if (contentView && contentView.removeChild) {
             contentView.removeChild(v);
        }
      } catch (e) {
          // Ignore
      }
  });

  const contentView = (mainWindow as any).contentView;

  if (currentActiveUserId && !splitViewUserId) {
      const v = getOrCreateView(currentActiveUserId);
      if (contentView && contentView.addChild) {
          contentView.addChild(v);
      }
      v.setBounds({ x: sidebarWidth, y: 0, width: contentWidth, height: height });
  } else if (currentActiveUserId && splitViewUserId) {
      const v1 = getOrCreateView(currentActiveUserId);
      const v2 = getOrCreateView(splitViewUserId);

      if (contentView && contentView.addChild) {
          contentView.addChild(v1);
          contentView.addChild(v2);
      }

      const halfWidth = Math.floor(contentWidth / 2);
      v1.setBounds({ x: sidebarWidth, y: 0, width: halfWidth, height: height });
      v2.setBounds({ x: sidebarWidth + halfWidth, y: 0, width: contentWidth - halfWidth, height: height });
  }
}

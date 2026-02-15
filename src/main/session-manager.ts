import { session, Session } from 'electron';
import { isAllowedPermissionOrigin } from './url-utils';

export function getSession(userId: string): Session {
  const trimmedUserId = userId ? userId.trim() : '';
  if (!trimmedUserId) {
    throw new Error('Invalid userId: cannot be empty or whitespace-only');
  }

  const partition = `persist:user_${trimmedUserId}`;
  const sess = session.fromPartition(partition);

  // Configure session: Set User-Agent to prevent Google login blocks
  // Use a fixed Chrome User-Agent to ensure compatibility
  const chromeMajorVersion = '133';
  const fullChromeVersion = '133.0.6943.53';
  let userAgent = '';
  if (process.platform === 'darwin') {
    userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${fullChromeVersion} Safari/537.36`;
  } else if (process.platform === 'win32') {
    userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${fullChromeVersion} Safari/537.36`;
  } else {
    userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${fullChromeVersion} Safari/537.36`;
  }
  sess.setUserAgent(userAgent);

  // Configure Client Hints headers to mimic Chrome and remove Electron references
  sess.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders } = details;

    // Helper to safely set headers regardless of case
    const setHeader = (name: string, value: string) => {
      // Find existing key with case-insensitive match
      const existingKey = Object.keys(requestHeaders).find(k => k.toLowerCase() === name.toLowerCase());
      if (existingKey) {
        requestHeaders[existingKey] = value;
      } else {
        requestHeaders[name] = value;
      }
    };

    // Standard Chrome sec-ch-ua
    // Order: GREASE, Google Chrome, Chromium
    // e.g. "Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"
    const secChUa = `"Not(A:Brand";v="99", "Google Chrome";v="${chromeMajorVersion}", "Chromium";v="${chromeMajorVersion}"`;
    setHeader('sec-ch-ua', secChUa);

    // Standard Chrome sec-ch-ua-mobile
    setHeader('sec-ch-ua-mobile', '?0');

    // Standard Chrome sec-ch-ua-platform
    let platform = '';
    if (process.platform === 'darwin') {
      platform = '"macOS"';
    } else if (process.platform === 'win32') {
      platform = '"Windows"';
    } else {
      platform = '"Linux"';
    }
    setHeader('sec-ch-ua-platform', platform);

    // If full version list is requested/sent, update it too
    const existingFullVersion = Object.keys(requestHeaders).find(k => k.toLowerCase() === 'sec-ch-ua-full-version-list');
    if (existingFullVersion) {
        requestHeaders[existingFullVersion] = `"Chromium";v="${fullChromeVersion}", "Not(A:Brand";v="99.0.0.0", "Google Chrome";v="${fullChromeVersion}"`;
    }

    callback({ requestHeaders });
  });

  // Additional configuration (e.g., CSP, permissions) can be added here
  const allowedPermissions = ['notifications', 'media', 'fullscreen'];

  sess.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    // Check origin
    if (!isAllowedPermissionOrigin(details.requestingUrl)) {
      return callback(false);
    }

    // Allow notifications, media, etc.
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  sess.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    if (!isAllowedPermissionOrigin(requestingOrigin)) {
      return false;
    }

    if (allowedPermissions.includes(permission)) {
      return true;
    }

    return false;
  });

  return sess;
}

export async function clearSessionData(userId: string) {
  const sess = getSession(userId);
  await sess.clearStorageData();
}

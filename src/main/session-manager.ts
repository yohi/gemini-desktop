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
  // Use the actual Chrome version from the Electron runtime
  const chromeVersion = process.versions.chrome;
  let userAgent = '';
  if (process.platform === 'darwin') {
    userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  } else if (process.platform === 'win32') {
    userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  } else {
    userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  }
  sess.setUserAgent(userAgent);

  // Configure Client Hints headers to mimic Chrome and remove Electron references
  sess.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders } = details;
    const chromeMajorVersion = chromeVersion.split('.')[0];

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
    const secChUa = `"Chromium";v="${chromeMajorVersion}", "Google Chrome";v="${chromeMajorVersion}", "Not-A.Brand";v="99"`;
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
        requestHeaders[existingFullVersion] = `"Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}", "Not-A.Brand";v="99.0.0.0"`;
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

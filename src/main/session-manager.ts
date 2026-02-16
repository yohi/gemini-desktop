import { session, Session } from 'electron';
import { isAllowedPermissionOrigin } from './url-utils';

export const CHROME_MAJOR_VERSION = '133';
export const CHROME_VERSION = '133.0.6943.98';

// Switch to Edge User-Agent as it matches Chromium behavior better than Firefox
export const EDGE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0';

export function getUserAgent(): string {
  return EDGE_UA;
}

export function getSession(userId: string): Session {
  const trimmedUserId = userId ? userId.trim() : '';
  if (!trimmedUserId) {
    throw new Error('Invalid userId: cannot be empty or whitespace-only');
  }

  const partition = `persist:user_${trimmedUserId}`;
  const sess = session.fromPartition(partition);

  // Configure session: Set User-Agent to prevent Google login blocks
  // Use a fixed Chrome User-Agent to ensure compatibility (Latest Stable as of Feb 2026)
  sess.setUserAgent(getUserAgent());

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

    // Edge sec-ch-ua
    const secChUa = `"Not(A:Brand";v="99", "Microsoft Edge";v="${CHROME_MAJOR_VERSION}", "Chromium";v="${CHROME_MAJOR_VERSION}"`;
    setHeader('sec-ch-ua', secChUa);

    // Standard Chrome sec-ch-ua-mobile
    setHeader('sec-ch-ua-mobile', '?0');

    // Standard Chrome sec-ch-ua-platform
    setHeader('sec-ch-ua-platform', '"Windows"');

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

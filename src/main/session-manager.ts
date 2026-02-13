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
  // Using a more recent Chrome UA for Linux (Chrome 144)
  const chromeVersion = '144.0.7559.67';
  let userAgent = '';
  if (process.platform === 'darwin') {
    userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  } else if (process.platform === 'win32') {
    userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  } else {
    userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  }
  sess.setUserAgent(userAgent);

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

import { session, Session } from 'electron';

export function getSession(userId: string): Session {
  const partition = `persist:user_${userId}`;
  const sess = session.fromPartition(partition);

  // Configure session: Set User-Agent to prevent Google login blocks
  // Using a standard Chrome UA for Linux
  sess.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // Additional configuration (e.g., CSP, permissions) can be added here
  sess.setPermissionRequestHandler((_webContents, permission, callback) => {
    // Allow notifications, media, etc.
    const allowedPermissions = ['notifications', 'media', 'fullscreen'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  return sess;
}

export async function clearSessionData(userId: string) {
  const sess = getSession(userId);
  await sess.clearStorageData();
}

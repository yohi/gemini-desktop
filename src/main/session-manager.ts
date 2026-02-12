import { session, Session } from 'electron';

// Helper to check if origin is allowed
function isAllowedOrigin(originUrlOrString: string): boolean {
  try {
    // requestingUrl is a full URL, requestingOrigin is an origin string.
    // Both can be parsed by new URL().
    const url = new URL(originUrlOrString);
    const hostname = url.hostname;

    // Allow Gemini directly
    if (hostname === 'gemini.google.com') return true;

    // Allow Google accounts and services
    if (hostname === 'accounts.google.com') return true;

    // Allow subdomains of key Google services
    if (hostname.endsWith('.google.com')) return true;
    if (hostname.endsWith('.gstatic.com')) return true;
    if (hostname.endsWith('.googleapis.com')) return true;
    if (hostname.endsWith('.googleusercontent.com')) return true;
    if (hostname.endsWith('.youtube.com')) return true;

    return false;
  } catch (e) {
    return false;
  }
}

export function getSession(userId: string): Session {
  const trimmedUserId = userId ? userId.trim() : '';
  if (!trimmedUserId) {
    throw new Error('Invalid userId: cannot be empty or whitespace-only');
  }

  const partition = `persist:user_${trimmedUserId}`;
  const sess = session.fromPartition(partition);

  // Configure session: Set User-Agent to prevent Google login blocks
  // Using a more recent Chrome UA for Linux (Chrome 142)
  sess.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');

  // Additional configuration (e.g., CSP, permissions) can be added here
  const allowedPermissions = ['notifications', 'media', 'fullscreen'];

  sess.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    // Check origin
    if (!isAllowedOrigin(details.requestingUrl)) {
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
    if (!isAllowedOrigin(requestingOrigin)) {
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

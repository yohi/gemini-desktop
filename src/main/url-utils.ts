
/**
 * Helper to check if origin is allowed for general navigation/resources.
 * Only allows HTTPS and specific Google domains.
 */
export function isAllowedOrigin(originUrlOrString: string): boolean {
  try {
    const url = new URL(originUrlOrString);
    if (url.protocol !== 'https:') return false;
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

/**
 * Helper to check if origin is allowed to request permissions (notifications, media, etc.).
 * Strictly limits to Gemini and Google Accounts.
 */
export function isAllowedPermissionOrigin(originUrlOrString: string): boolean {
  try {
    const url = new URL(originUrlOrString);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname;

    return (
      hostname === 'gemini.google.com' ||
      hostname === 'accounts.google.com'
    );
  } catch (e) {
    return false;
  }
}


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

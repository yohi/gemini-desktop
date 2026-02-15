import { contextBridge, ipcRenderer } from 'electron';

// Spoof navigator properties to prevent detection
try {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });

  // Remove plugins spoofing as it might be detectable if done poorly
  // The session's userAgent settings should handle the main detection points.
  // Object.defineProperty(navigator, 'plugins', { ... });

  // Optional: spoof languages if needed, but let's trust the session
  // Object.defineProperty(navigator, 'languages', { ... });

} catch (e) {
  console.error('Failed to spoof navigator properties', e);
}

contextBridge.exposeInMainWorld('electronAPI', {
  getUsers: () => ipcRenderer.invoke('get-users'),
  addUser: (name: string) => ipcRenderer.invoke('add-user', name),
  switchUser: (userId: string) => ipcRenderer.invoke('switch-user', userId),
  toggleSplit: (primaryId: string, secondaryId: string) => ipcRenderer.invoke('toggle-split', primaryId, secondaryId),
  removeUser: (userId: string) => ipcRenderer.invoke('remove-user', userId),
  clearSessionData: (userId: string) => ipcRenderer.invoke('clear-session-data', userId),
});

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getUsers: () => ipcRenderer.invoke('get-users'),
  addUser: (name: string) => ipcRenderer.invoke('add-user', name),
  switchUser: (userId: string) => ipcRenderer.invoke('switch-user', userId),
  toggleSplit: (primaryId: string, secondaryId: string) => ipcRenderer.invoke('toggle-split', primaryId, secondaryId),
  removeUser: (userId: string) => ipcRenderer.invoke('remove-user', userId),
});

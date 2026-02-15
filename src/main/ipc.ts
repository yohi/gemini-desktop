import { ipcMain } from 'electron';
import { switchUser, enableSplitView } from './window-manager';
import { getUsers, addUser, removeUser, User } from './store';
import { clearSessionData } from './session-manager';
import crypto from 'crypto';

export function registerIpcHandlers() {
  ipcMain.handle('get-users', () => {
    return getUsers();
  });

  ipcMain.handle('add-user', (_event, name: string) => {
    const id = crypto.randomUUID();
    const newUser: User = { id, name, lastActive: Date.now() };
    addUser(newUser);
    return newUser;
  });

  ipcMain.handle('switch-user', (_event, userId: string) => {
    switchUser(userId);
  });

  ipcMain.handle('toggle-split', (_event, primaryId: string, secondaryId: string) => {
    enableSplitView(primaryId, secondaryId);
  });

  ipcMain.handle('remove-user', (_event, userId: string) => {
      removeUser(userId);
  });

  ipcMain.handle('clear-session-data', (_event, userId: string) => {
    return clearSessionData(userId);
  });
}

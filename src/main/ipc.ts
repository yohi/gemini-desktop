import { ipcMain } from 'electron';
import { switchUser, enableSplitView, isMainWindow, getUserIdFromWebContents } from './window-manager';
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

  ipcMain.handle('clear-session-data', async (event, userId: string) => {
    // 1. Verify target user exists
    const users = getUsers();
    const userExists = users.some(u => u.id === userId);
    if (!userExists) {
      console.error(`[IPC] clear-session-data: User ${userId} not found.`);
      throw new Error(`User ${userId} not found.`);
    }

    // 2. Determine caller identity
    const sender = event.sender;
    const isMain = isMainWindow(sender);
    const callerUserId = getUserIdFromWebContents(sender);

    // 3. Authorization
    // Allow if caller is Main Window (Admin) OR caller is the target user
    if (isMain || callerUserId === userId) {
      console.log(`[IPC] clear-session-data: Authorized request for user ${userId} (Caller: ${isMain ? 'Main Window' : callerUserId})`);
      return await clearSessionData(userId);
    } else {
      console.warn(`[IPC] clear-session-data: Unauthorized request. Caller: ${callerUserId || 'Unknown'}, Target: ${userId}`);
      throw new Error('Unauthorized: You can only clear your own session.');
    }
  });
}

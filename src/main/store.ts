import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const userDataPath = app.getPath('userData');
const usersFile = path.join(userDataPath, 'users.json');

export interface User {
  id: string;
  name: string;
  avatar?: string;
  lastActive: number;
}

export function getUsers(): User[] {
  try {
    if (!fs.existsSync(usersFile)) return [];
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
}

export function saveUsers(users: User[]) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users file:', error);
  }
}

export function addUser(user: User) {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
}

export function removeUser(userId: string) {
  let users = getUsers();
  users = users.filter(u => u.id !== userId);
  saveUsers(users);
}

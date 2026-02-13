import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  avatar?: string;
  lastActive: number;
}

interface AppState {
  users: User[];
  activeUserId: string | null;
  splitViewUserId: string | null;

  setUsers: (users: User[]) => void;
  setActiveUser: (id: string) => void;
  setSplitViewUser: (id: string | null) => void;
  addUser: (name: string) => Promise<void>;
  switchUser: (id: string) => Promise<void>;
  toggleSplit: (primaryId: string, secondaryId: string) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: {
      getUsers: () => Promise<User[]>;
      addUser: (name: string) => Promise<User>;
      switchUser: (userId: string) => Promise<void>;
      toggleSplit: (primaryId: string, secondaryId: string) => Promise<void>;
      removeUser: (userId: string) => Promise<void>;
    };
  }
}

export const useStore = create<AppState>((set, get) => ({
  users: [],
  activeUserId: null,
  splitViewUserId: null,

  setUsers: (users) => set({ users }),
  setActiveUser: (id) => set({ activeUserId: id }),
  setSplitViewUser: (id) => set({ splitViewUserId: id }),

  refreshUsers: async () => {
    try {
      const users = await window.electronAPI.getUsers();
      set({ users });
    } catch (e) {
      console.error(e);
    }
  },

  addUser: async (name) => {
    try {
      const user = await window.electronAPI.addUser(name);
      set((state) => ({ users: [...state.users, user] }));
      try {
        await get().switchUser(user.id);
      } catch (switchError) {
        set((state) => ({ users: state.users.filter((u) => u.id !== user.id) }));
        throw switchError;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  switchUser: async (id) => {
    const previousState = {
      activeUserId: get().activeUserId,
      splitViewUserId: get().splitViewUserId
    };
    set({ activeUserId: id, splitViewUserId: null });
    try {
      await window.electronAPI.switchUser(id);
    } catch (error) {
      set(previousState);
      throw error;
    }
  },

  toggleSplit: async (primaryId, secondaryId) => {
    const previousState = {
      activeUserId: get().activeUserId,
      splitViewUserId: get().splitViewUserId
    };
    set({ activeUserId: primaryId, splitViewUserId: secondaryId });
    try {
      await window.electronAPI.toggleSplit(primaryId, secondaryId);
    } catch (error) {
      set(previousState);
      throw error;
    }
  },

  removeUser: async (id) => {
    try {
      await window.electronAPI.removeUser(id);
      set((state) => ({ users: state.users.filter(u => u.id !== id) }));
      // If active user removed, switch to another? Logic for later.
    } catch (e) {
      console.error(e);
    }
  }
}));

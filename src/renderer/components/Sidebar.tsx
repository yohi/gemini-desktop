import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, User as UserIcon, X, Columns } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Sidebar() {
  const { users, activeUserId, splitViewUserId, addUser, switchUser, toggleSplit, removeUser } = useStore();
  const [newUserName, setNewUserName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      await addUser(newUserName.trim());
      setNewUserName('');
      setIsAdding(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData('userId', userId);
  };

  const handleDrop = (e: React.DragEvent, targetUserId: string) => {
    e.preventDefault();
    const sourceUserId = e.dataTransfer.getData('userId');
    if (sourceUserId && sourceUserId !== targetUserId) {
      toggleSplit(targetUserId, sourceUserId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <aside className="w-[72px] h-full bg-gray-900 border-r border-gray-700 flex flex-col z-50 relative pointer-events-auto shadow-xl transition-all">
      <div className="py-4 border-b border-gray-700 flex flex-col items-center gap-3 bg-gray-900 sticky top-0">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg text-white font-bold text-xl">
          G
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-10 h-10 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          title="Add User"
          aria-label="Add User"
        >
          <Plus size={24} />
        </button>
      </div>

      {isAdding && (
        <div className="absolute left-[84px] top-[68px] z-50 animate-in fade-in slide-in-from-left-2">
          <form
            onSubmit={handleAddUser}
            className="bg-gray-800 p-3 rounded-xl shadow-2xl border border-gray-700 w-60 flex flex-col gap-2 relative z-10"
          >
            <div className="flex justify-between items-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              <span>New Session</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Enter name..."
              className="w-full bg-gray-900 text-white p-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 text-sm placeholder:text-gray-600"
              autoFocus
            />
            <div className="flex justify-end">
                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs py-1 px-3 rounded-lg font-medium transition-colors"
                >
                    Create
                </button>
            </div>
          </form>
          <div className="absolute top-4 -left-1.5 w-3 h-3 bg-gray-800 border-l border-b border-gray-700 transform rotate-45 z-20" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            draggable
            onDragStart={(e) => handleDragStart(e, user.id)}
            onDrop={(e) => handleDrop(e, user.id)}
            onDragOver={handleDragOver}
            onClick={() => switchUser(user.id)}
            title={user.name}
            className={cn(
              "w-12 h-12 flex items-center justify-center relative group cursor-pointer transition-all mx-auto select-none",
              activeUserId === user.id
                ? "bg-blue-600 text-white shadow-md rounded-2xl"
                : splitViewUserId === user.id
                  ? "bg-indigo-600 text-white shadow-md rounded-2xl"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white rounded-3xl hover:rounded-2xl"
            )}
          >
            <UserIcon size={20} />

            {splitViewUserId === user.id && (
                <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-1 border-2 border-gray-900">
                    <Columns size={10} className="text-white" />
                </div>
            )}

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove user ${user.name}?`)) {
                        removeUser(user.id);
                    }
                }}
                className="opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm z-10 transition-opacity"
                title="Remove User"
                aria-label={`Remove ${user.name}`}
            >
                <X size={12} />
            </button>
          </div>
        ))}

        {users.length === 0 && !isAdding && (
            <div className="flex flex-col items-center justify-center py-8 opacity-50">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mb-2">
                    <UserIcon size={20} className="text-gray-500" />
                </div>
            </div>
        )}
      </div>

      <div className="py-3 border-t border-gray-700 flex justify-center bg-gray-900">
      </div>
    </aside>
  );
}

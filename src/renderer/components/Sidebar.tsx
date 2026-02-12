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
    <aside className="w-[250px] h-full bg-gray-900 border-r border-gray-700 flex flex-col z-50 relative pointer-events-auto shadow-xl">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 sticky top-0">
        <h1 className="text-xl font-bold text-white">Gemini</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
          title="Add User"
        >
          <Plus size={20} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddUser} className="p-2 border-b border-gray-700 bg-gray-800 animate-in slide-in-from-top-2">
          <input
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="User Name"
            className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
            autoFocus
          />
        </form>
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
            className={cn(
              "flex items-center p-3 rounded cursor-pointer transition-all group relative select-none",
              activeUserId === user.id ? "bg-blue-600 text-white shadow-md" :
              splitViewUserId === user.id ? "bg-indigo-600 text-white shadow-md" :
              "bg-gray-800 text-gray-300 hover:bg-gray-700"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3 shrink-0 border border-gray-500">
              <UserIcon size={16} />
            </div>
            <span className="truncate flex-1 font-medium text-sm">{user.name}</span>

            {splitViewUserId === user.id && (
                <Columns size={16} className="text-white opacity-70 mr-2 shrink-0" title="Split View Active" />
            )}

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove user ${user.name}?`)) {
                        removeUser(user.id);
                    }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-all absolute right-2"
                title="Remove User"
            >
                <X size={14} />
            </button>
          </div>
        ))}

        {users.length === 0 && !isAdding && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-center p-4">
                <div className="bg-gray-800 p-3 rounded-full mb-3">
                    <UserIcon size={24} className="opacity-50" />
                </div>
                <p className="font-medium">No users yet.</p>
                <p className="text-xs mt-1">Click the + button above to create a new isolated session.</p>
            </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-700 text-[10px] text-gray-500 text-center bg-gray-900">
        Drag & Drop users to Split View
      </div>
    </aside>
  );
}

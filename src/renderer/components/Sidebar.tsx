import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, User as UserIcon, X, Columns, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Sidebar() {
  const { users, activeUserId, splitViewUserId, addUser, updateUser, switchUser, toggleSplit, removeUser } = useStore();
  const [newUserName, setNewUserName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{top: number, left: number} | null>(null);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      await addUser(newUserName.trim());
      setNewUserName('');
      setIsAdding(false);
    }
  };

  const handleLogin = async () => {
      try {
          await window.electronAPI.login();
          setMenuUserId(null); // Close menu
      } catch (err) {
          console.error("Login failed", err);
      }
  };

  const handleLogout = async () => {
      try {
          await window.electronAPI.logout();
          if (activeUserId) {
             updateUser(activeUserId, { isAuthenticated: false, email: undefined, picture: undefined });
          }
          setMenuUserId(null);
      } catch (err) {
          console.error("Logout failed", err);
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
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg text-white font-bold text-xl select-none">
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

      <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
        {users.map((user) => (
          <div key={user.id} className="relative">
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, user.id)}
              onDrop={(e) => handleDrop(e, user.id)}
              onDragOver={handleDragOver}
              onMouseDown={() => {
                  // Prevent drag from starting if we want to click
                  // but we actually want draggable, so we just log or handle specially
              }}
              onClick={(e) => {
                  console.log(`User icon clicked: ${user.id}, active: ${activeUserId}`);
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (activeUserId === user.id) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      console.log(`Sidebar user click coords: top=${rect.top}, left=${rect.left}, right=${rect.right}, bottom=${rect.bottom}`);
                      if (menuUserId === user.id) {
                          setMenuUserId(null);
                          setPopoverPos(null);
                      } else {
                          setPopoverPos({ top: rect.top, left: rect.right + 12 });
                          setMenuUserId(user.id);
                      }
                  } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      console.log(`Sidebar user switch click coords: top=${rect.top}, left=${rect.left}, right=${rect.right}, bottom=${rect.bottom}`);
                      switchUser(user.id);
                      setMenuUserId(null);
                      setPopoverPos(null);
                  }
              }}
              title={user.name}
              className={cn(
                "w-12 h-12 flex items-center justify-center relative group cursor-pointer transition-all mx-auto select-none",
                activeUserId === user.id
                  ? "bg-blue-600 text-white shadow-md rounded-2xl ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500"
                  : splitViewUserId === user.id
                    ? "bg-indigo-600 text-white shadow-md rounded-2xl"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white rounded-3xl hover:rounded-2xl"
              )}
            >
              <div className="w-full h-full overflow-hidden rounded-[inherit] flex items-center justify-center">
                {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                    <UserIcon size={20} />
                )}
              </div>

              {splitViewUserId === user.id && (
                  <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-1 border-2 border-gray-900 z-10">
                      <Columns size={10} className="text-white" />
                  </div>
              )}

               {/* Remove Button */}
              <button
                  onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove user ${user.name}?`)) {
                          removeUser(user.id);
                      }
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm z-20 transition-opacity"
                  title="Remove User"
                  aria-label={`Remove ${user.name}`}
              >
                  <X size={12} />
              </button>
            </div>

            {/* User Menu Popover */}
            {menuUserId === user.id && popoverPos && (
                <div 
                    className="fixed z-[100] animate-in fade-in slide-in-from-left-2 w-56"
                    style={{ top: popoverPos.top, left: popoverPos.left }}
                >
                    <div className="bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-700 flex flex-col gap-3 relative z-10">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="font-bold text-white text-base truncate pr-2">{user.name}</h3>
                                <p className="text-xs text-gray-400 truncate">{user.email || "No email linked"}</p>
                             </div>
                             <button onClick={() => setMenuUserId(null)} className="text-gray-400 hover:text-white p-1">
                                 <X size={16} />
                             </button>
                        </div>

                        <div className="h-px bg-gray-700 w-full" />

                        <div className="flex flex-col gap-2">
                            {user.isAuthenticated ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-green-400 text-xs font-medium px-2 py-1 bg-green-400/10 rounded-lg w-fit">
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        Google Connected
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-lg transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Sign out
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                     <div className="text-gray-400 text-xs px-1">
                                        Sign in to access Google services.
                                     </div>
                                    <button
                                        onClick={handleLogin}
                                        className="w-full flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 font-medium text-sm py-2 px-3 rounded-lg transition-colors border border-gray-200"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        Sign in with Google
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-6 -left-1.5 w-3 h-3 bg-gray-800 border-l border-b border-gray-700 transform rotate-45 z-20" />
                </div>
            )}
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

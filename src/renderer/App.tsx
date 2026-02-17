import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';

function App() {
  const { refreshUsers, activeUserId, updateUser } = useStore();

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  // Auth Event Listeners
  useEffect(() => {
    const removeSuccess = window.electronAPI.onAuthSuccess((data) => {
      console.log('Auth Success:', data);
      if (activeUserId) {
        updateUser(activeUserId, {
          isAuthenticated: true,
          name: data.name || data.email, // Fallback
          email: data.email,
          picture: data.picture
        });
      }
    });

    const removeError = window.electronAPI.onAuthError((err) => {
      console.error('Auth Error:', err);
      // Optional: Show toast or alert
    });

    return () => {
      removeSuccess();
      removeError();
    };
  }, [activeUserId, updateUser]);

  // Check initial auth state when active user changes
  useEffect(() => {
    const checkAuth = async () => {
      if (!activeUserId) return;
      try {
        const token = await window.electronAPI.getToken();
        // We might not have full user details if we just have a token,
        // but we know we are authenticated.
        // For now, just set isAuthenticated.
        // Ideally, we'd fetch profile info if missing.
        updateUser(activeUserId, { isAuthenticated: !!token });
      } catch (e) {
        console.error('Failed to get token:', e);
      }
    };
    checkAuth();
  }, [activeUserId, updateUser]);

  return (
    <div className="flex h-screen w-screen bg-transparent">
      {/* Sidebar handles user switching and is opaque */}
      <Sidebar />

      {/* The rest is empty space for WebContentsView which will be rendered by the main process */}
      <div className="flex-1 bg-transparent pointer-events-none">
      </div>
    </div>
  );
}

export default App;

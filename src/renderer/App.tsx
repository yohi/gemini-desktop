import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';

function App() {
  const { refreshUsers } = useStore();

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

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

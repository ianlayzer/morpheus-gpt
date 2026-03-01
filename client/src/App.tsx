import { useState, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { AuthPage } from "./components/AuthPage";

function AuthenticatedApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <ChatProvider>
      <div className="flex h-full">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/70 z-30 md:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-40 w-60 transform transition-transform duration-200 ease-out
            md:relative md:translate-x-0 md:z-auto
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <Sidebar onSessionSelect={closeSidebar} />
        </div>

        <ChatView onMenuClick={openSidebar} />
      </div>
    </ChatProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg)]">
        <div className="text-[var(--green-dark)] text-xs tracking-[0.3em] uppercase animate-pulse">
          INITIALIZING...
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

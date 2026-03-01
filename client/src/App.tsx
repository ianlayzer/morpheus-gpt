import { useState, useCallback } from "react";
import { ChatProvider } from "./context/ChatContext";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";

function App() {
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

export default App;

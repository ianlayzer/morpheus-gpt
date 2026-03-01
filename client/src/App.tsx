import { ChatProvider } from "./context/ChatContext";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";

function App() {
  return (
    <ChatProvider>
      <div className="flex h-full">
        <Sidebar />
        <ChatView />
      </div>
    </ChatProvider>
  );
}

export default App;

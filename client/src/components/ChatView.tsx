import { useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

export function ChatView({ onMenuClick }: { onMenuClick: () => void }) {
  const { state } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change or tokens stream in
  const lastMessage = state.messages[state.messages.length - 1];
  const streamingContent = lastMessage?.status === "streaming" ? lastMessage.content : null;

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(scrollToBottom, [state.messages.length, streamingContent]);

  // Re-scroll when mobile keyboard opens/closes (viewport resizes)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => scrollToBottom();
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, []);

  const activeSession = state.sessions.find(
    (s) => s.id === state.activeSessionId
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg)]">
      {/* Top bar: hamburger (mobile) + session title */}
      <div className="px-3 md:px-4 py-2 border-b border-[var(--border)] flex-shrink-0 flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden text-[var(--green)] text-sm tracking-wider flex-shrink-0 cursor-pointer"
          aria-label="Open menu"
        >
          [=]
        </button>
        <div className="flex-1 min-w-0 text-[var(--green)] text-sm tracking-wider truncate">
          {activeSession
            ? activeSession.title || "NEW SESSION"
            : "MORPHEUS"}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-4 pt-4 pb-4">
        <div className="max-w-3xl mx-auto">
          {!state.activeSessionId && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center boot-in max-w-lg px-2 md:px-6">
                {/* Full ASCII art on desktop, compact on mobile */}
                <pre className="hidden md:inline-block text-[var(--green)] glow text-xs leading-relaxed mb-6 text-left">
{`
 ███╗   ███╗ ██████╗ ██████╗ ██████╗ ██╗  ██╗███████╗██╗   ██╗███████╗
 ████╗ ████║██╔═══██╗██╔══██╗██╔══██╗██║  ██║██╔════╝██║   ██║██╔════╝
 ██╔████╔██║██║   ██║██████╔╝██████╔╝███████║█████╗  ██║   ██║███████╗
 ██║╚██╔╝██║██║   ██║██╔══██╗██╔═══╝ ██╔══██║██╔══╝  ██║   ██║╚════██║
 ██║ ╚═╝ ██║╚██████╔╝██║  ██║██║     ██║  ██║███████╗╚██████╔╝███████║
 ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝
`}
                </pre>
                {/* Mobile-friendly title */}
                <div className="md:hidden text-[var(--green)] glow text-2xl tracking-[0.2em] font-bold mb-6">
                  MORPHEUS
                </div>
                <div className="text-[var(--green-dim)] text-sm mb-4 leading-relaxed">
                  "I can only show you the door.
                  <br />
                  You're the one that has to walk through it."
                </div>
              </div>
            </div>
          )}
          {state.activeSessionId && state.messages.length === 0 && (
            <div className="py-16 boot-in">
              <div className="text-[var(--green-dark)] text-xs mb-4 tracking-wider">
                ── SESSION INITIALIZED ──
              </div>
              <div className="text-[var(--green-dim)] text-sm mb-2">
                "This is your last chance. After this, there is no turning
                back."
              </div>
              <div className="text-[var(--green-dark)] text-xs mt-4">
                Awaiting input... <span className="cursor-blink" />
              </div>
            </div>
          )}
          {state.messages.map((message, i) => (
            <MessageBubble key={message.id} message={message} isLast={i === state.messages.length - 1} />
          ))}
          <div />
        </div>
      </div>
      <ChatInput />
    </div>
  );
}

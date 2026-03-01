import { useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

export function ChatView() {
  const { state } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)]">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <div className="max-w-3xl mx-auto">
          {!state.activeSessionId && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center boot-in max-w-lg px-6">
                <pre className="text-[var(--green)] glow text-xs leading-relaxed mb-6 inline-block text-left">
{`
 ███╗   ███╗ ██████╗ ██████╗ ██████╗ ██╗  ██╗███████╗██╗   ██╗███████╗
 ████╗ ████║██╔═══██╗██╔══██╗██╔══██╗██║  ██║██╔════╝██║   ██║██╔════╝
 ██╔████╔██║██║   ██║██████╔╝██████╔╝███████║█████╗  ██║   ██║███████╗
 ██║╚██╔╝██║██║   ██║██╔══██╗██╔═══╝ ██╔══██║██╔══╝  ██║   ██║╚════██║
 ██║ ╚═╝ ██║╚██████╔╝██║  ██║██║     ██║  ██║███████╗╚██████╔╝███████║
 ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝
`}
                </pre>
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
          {state.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatInput />
    </div>
  );
}

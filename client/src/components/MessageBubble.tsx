import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../lib/api";
import { useTypewriter } from "../lib/useTypewriter";
import { useChat } from "../context/ChatContext";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const displayedContent = useTypewriter(message.content, isStreaming);
  const stillTyping = !isUser && displayedContent.length < message.content.length;
  const { setTyping } = useChat();

  // Report typing state for the last assistant message
  useEffect(() => {
    if (isLast && !isUser) {
      setTyping(stillTyping);
    }
  }, [isLast, isUser, stillTyping, setTyping]);

  return (
    <div className="mb-3 boot-in flex gap-2 md:gap-3">
      {/* Timestamp — hidden on mobile, shown on md+ */}
      <span className="hidden md:inline text-[var(--green-dark)] text-[10px] pt-0.5 flex-shrink-0 select-none opacity-50 w-10 text-right">
        {formatTime(message.createdAt)}
      </span>

      <div className="flex-1 min-w-0">
        {/* Terminal-style prefix line */}
        <div className="flex items-baseline gap-2 text-xs mb-0.5">
          {isUser ? (
            <span className="text-[var(--green)] glow font-bold tracking-wider">
              YOU &gt;
            </span>
          ) : (
            <span className="text-[var(--green)] glow font-bold tracking-wider">
              MORPHEUS &gt;
            </span>
          )}
          {!isUser && (isStreaming || stillTyping) && (
            <span className="text-[var(--green-dark)] text-[10px] tracking-widest">
              [TRANSMITTING]
            </span>
          )}
          {/* Timestamp inline on mobile */}
          <span className="md:hidden text-[var(--green-dark)] text-[10px] select-none opacity-50 ml-auto">
            {formatTime(message.createdAt)}
          </span>
        </div>

      {/* Message content */}
      <div
        className={`pl-3 md:pl-4 border-l ${
          isUser
            ? "border-[var(--green-dark)] text-[var(--green-dim)]"
            : "border-[var(--green-dark)] text-[var(--green)]"
        }`}
      >
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          <div className={`prose text-sm ${(isStreaming || stillTyping) ? "typing" : ""}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayedContent}
            </ReactMarkdown>
          </div>
        )}

        {message.status === "cancelled" && (
          <div className="text-[var(--amber)] text-xs mt-1 tracking-wider">
            [TRANSMISSION CANCELLED]
          </div>
        )}
        {message.status === "error" && (
          <div className="text-[var(--red)] text-xs mt-1 tracking-wider">
            [SIGNAL LOST]
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

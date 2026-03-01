import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../lib/api";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className="mb-3 boot-in">
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
        {!isUser && message.status === "streaming" && (
          <span className="text-[var(--green-dark)] text-[10px] tracking-widest">
            [TRANSMITTING]
          </span>
        )}
      </div>

      {/* Message content */}
      <div
        className={`pl-4 border-l ${
          isUser
            ? "border-[var(--green-dark)] text-[var(--green-dim)]"
            : "border-[var(--green-dark)] text-[var(--green)]"
        }`}
      >
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {message.status === "streaming" && (
              <span className="cursor-stream" />
            )}
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
  );
}

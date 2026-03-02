import { useState, useRef, useEffect } from "react";
import { useChat } from "../context/ChatContext";

export function ChatInput() {
  const { state, sendMessage, cancelStream } = useChat();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [state.activeSessionId]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || state.isStreaming) return;
    setInput("");
    sendMessage(trimmed);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  return (
    <div className="border-t border-[var(--border)] px-3 md:px-4 py-2 md:py-3">
      {state.error && (
        <div className="text-[var(--red)] text-xs mb-2 tracking-wider">
          ERROR: {state.error}
        </div>
      )}
      <div className="flex items-center gap-2 max-w-3xl mx-auto">
        <span className="text-[var(--green)] glow text-sm flex-shrink-0 select-none">
          &gt;
        </span>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter the Matrix..."
          disabled={state.isStreaming}
          rows={1}
          className="flex-1 bg-transparent border-none text-base md:text-sm text-[var(--green)] placeholder-[var(--green-dark)] resize-none outline-none disabled:opacity-30 font-[inherit] py-2"
        />
        {state.isStreaming ? (
          <button
            onClick={cancelStream}
            className="px-3 py-1.5 border border-[var(--red)] text-[var(--red)] text-xs tracking-wider hover:bg-[rgba(255,51,51,0.1)] transition-colors cursor-pointer font-[inherit] flex-shrink-0"
          >
            [ABORT]
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="px-3 py-1.5 border border-[var(--green-dark)] text-[var(--green)] text-xs tracking-wider hover:bg-[var(--green-glow)] hover:border-[var(--green)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer font-[inherit] flex-shrink-0"
          >
            [SEND]
          </button>
        )}
      </div>
      <div className="hidden md:block text-[var(--green-dark)] text-[10px] mt-1.5 text-center tracking-widest opacity-50">
        ENTER = TRANSMIT &nbsp;&nbsp; SHIFT+ENTER = NEWLINE
      </div>
    </div>
  );
}

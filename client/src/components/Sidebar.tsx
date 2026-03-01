import { useState } from "react";
import { useChat } from "../context/ChatContext";

export function Sidebar() {
  const { state, createSession, selectSession, renameSession, deleteSession } =
    useChat();

  return (
    <aside className="w-60 flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-4 pb-3 border-b border-[var(--border)]">
        <div className="text-[var(--green)] glow text-xs tracking-[0.3em] uppercase mb-3 text-center">
          [ Sessions ]
        </div>
        <button
          onClick={createSession}
          className="w-full px-3 py-1.5 text-sm border border-[var(--green-dark)] text-[var(--green)] bg-transparent hover:bg-[var(--green-glow)] hover:border-[var(--green)] transition-colors cursor-pointer tracking-wider"
        >
          + NEW SESSION
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {state.sessions.map((session, i) => (
          <SessionItem
            key={session.id}
            session={session}
            index={i}
            isActive={session.id === state.activeSessionId}
            onSelect={() => selectSession(session.id)}
            onRename={(title) => renameSession(session.id, title)}
            onDelete={() => deleteSession(session.id)}
          />
        ))}
        {state.sessions.length === 0 && (
          <div className="px-3 py-6 text-center text-[var(--green-dark)] text-xs">
            NO ACTIVE SESSIONS
            <br />
            <span className="text-[var(--green-dark)] opacity-60">
              Create one to begin.
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[var(--border)] text-center">
        <span className="text-[10px] text-[var(--green-dark)] tracking-[0.2em]">
          MORPHEUS v1.0
        </span>
      </div>
    </aside>
  );
}

function SessionItem({
  session,
  index,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  session: { id: string; title: string | null };
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(session.title || "");
    setEditing(true);
  };

  const submitEdit = () => {
    if (editValue.trim()) {
      onRename(editValue.trim());
    }
    setEditing(false);
  };

  const displayTitle = session.title || "Untitled";
  const prefix = String(index).padStart(2, "0");

  return (
    <div
      onClick={onSelect}
      className={`group px-3 py-1.5 cursor-pointer flex items-center gap-2 text-xs transition-colors ${
        isActive
          ? "bg-[var(--green-glow)] text-[var(--green)]"
          : "text-[var(--green-dark)] hover:text-[var(--green-dim)] hover:bg-[var(--green-glow)]"
      }`}
    >
      {editing ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={submitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-[var(--bg)] border border-[var(--green-dark)] text-xs text-[var(--green)] px-1 py-0.5 outline-none font-[inherit]"
        />
      ) : (
        <>
          <span className="opacity-40 flex-shrink-0">{prefix}</span>
          <span className="flex-1 truncate">
            {isActive && <span className="mr-1">&gt;</span>}
            {displayTitle}
          </span>
          <div className="hidden group-hover:flex gap-1.5 flex-shrink-0">
            <button
              onClick={startEdit}
              className="text-[var(--green-dark)] hover:text-[var(--green)] transition-colors"
              title="Rename"
            >
              [e]
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-[var(--green-dark)] hover:text-[var(--red)] transition-colors"
              title="Delete"
            >
              [x]
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import * as api from "../lib/api";

interface ChatState {
  sessions: api.Session[];
  activeSessionId: string | null;
  messages: api.Message[];
  isStreaming: boolean;
  error: string | null;
}

type ChatAction =
  | { type: "SET_SESSIONS"; sessions: api.Session[] }
  | { type: "ADD_SESSION"; session: api.Session }
  | { type: "UPDATE_SESSION_TITLE"; id: string; title: string }
  | { type: "REMOVE_SESSION"; id: string }
  | { type: "SET_ACTIVE_SESSION"; id: string | null }
  | { type: "SET_MESSAGES"; messages: api.Message[] }
  | { type: "ADD_MESSAGE"; message: api.Message }
  | { type: "APPEND_TOKEN"; text: string }
  | { type: "FINALIZE_STREAM" }
  | { type: "SET_STREAMING"; isStreaming: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "CANCEL_STREAM" };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_SESSIONS":
      return { ...state, sessions: action.sessions };
    case "ADD_SESSION":
      return { ...state, sessions: [action.session, ...state.sessions] };
    case "UPDATE_SESSION_TITLE":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.id ? { ...s, title: action.title } : s
        ),
      };
    case "REMOVE_SESSION": {
      const newSessions = state.sessions.filter((s) => s.id !== action.id);
      return {
        ...state,
        sessions: newSessions,
        activeSessionId:
          state.activeSessionId === action.id
            ? newSessions[0]?.id || null
            : state.activeSessionId,
        messages:
          state.activeSessionId === action.id ? [] : state.messages,
      };
    }
    case "SET_ACTIVE_SESSION":
      return { ...state, activeSessionId: action.id, messages: [], error: null };
    case "SET_MESSAGES":
      return { ...state, messages: action.messages };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };
    case "APPEND_TOKEN":
      return {
        ...state,
        messages: state.messages.map((m, i) =>
          i === state.messages.length - 1
            ? { ...m, content: m.content + action.text }
            : m
        ),
      };
    case "FINALIZE_STREAM":
      return {
        ...state,
        isStreaming: false,
        messages: state.messages.map((m, i) =>
          i === state.messages.length - 1
            ? { ...m, status: "complete" as const }
            : m
        ),
      };
    case "CANCEL_STREAM":
      return {
        ...state,
        isStreaming: false,
        messages: state.messages.map((m, i) =>
          i === state.messages.length - 1 && m.status === "streaming"
            ? { ...m, status: "cancelled" as const }
            : m
        ),
      };
    case "SET_STREAMING":
      return { ...state, isStreaming: action.isStreaming };
    case "SET_ERROR":
      return { ...state, error: action.error, isStreaming: false };
    default:
      return state;
  }
}

interface ChatContextValue {
  state: ChatState;
  createSession: () => Promise<void>;
  selectSession: (id: string) => void;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sendMessage: (content: string) => void;
  cancelStream: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, {
    sessions: [],
    activeSessionId: null,
    messages: [],
    isStreaming: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  // Load sessions on mount
  useEffect(() => {
    api.fetchSessions().then((sessions) => {
      dispatch({ type: "SET_SESSIONS", sessions });
      if (sessions.length > 0) {
        dispatch({ type: "SET_ACTIVE_SESSION", id: sessions[0].id });
      }
    });
  }, []);

  // Load messages when active session changes
  useEffect(() => {
    if (!state.activeSessionId) return;
    api.fetchMessages(state.activeSessionId).then((messages) => {
      dispatch({ type: "SET_MESSAGES", messages });
    });
  }, [state.activeSessionId]);

  const createSession = useCallback(async () => {
    const session = await api.createSession();
    dispatch({ type: "ADD_SESSION", session });
    dispatch({ type: "SET_ACTIVE_SESSION", id: session.id });
  }, []);

  const selectSession = useCallback((id: string) => {
    dispatch({ type: "SET_ACTIVE_SESSION", id });
  }, []);

  const handleRenameSession = useCallback(
    async (id: string, title: string) => {
      await api.renameSession(id, title);
      dispatch({ type: "UPDATE_SESSION_TITLE", id, title });
    },
    []
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await api.deleteSession(id);
      dispatch({ type: "REMOVE_SESSION", id });
    },
    []
  );

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!state.activeSessionId || state.isStreaming) return;

      dispatch({ type: "SET_STREAMING", isStreaming: true });
      dispatch({ type: "SET_ERROR", error: null });

      const controller = new AbortController();
      abortRef.current = controller;

      api
        .sendMessage(
          state.activeSessionId,
          content,
          (event) => {
            switch (event.type) {
              case "user_message":
                dispatch({ type: "ADD_MESSAGE", message: event.message });
                break;
              case "assistant_message":
                dispatch({ type: "ADD_MESSAGE", message: event.message });
                break;
              case "token":
                dispatch({ type: "APPEND_TOKEN", text: event.text });
                break;
              case "done":
                dispatch({ type: "FINALIZE_STREAM" });
                break;
              case "title":
                dispatch({
                  type: "UPDATE_SESSION_TITLE",
                  id: state.activeSessionId!,
                  title: event.title,
                });
                break;
              case "error":
                dispatch({ type: "SET_ERROR", error: event.message });
                break;
            }
          },
          controller.signal
        )
        .catch((err) => {
          if (err.name === "AbortError") {
            dispatch({ type: "CANCEL_STREAM" });
          } else {
            dispatch({
              type: "SET_ERROR",
              error: "Failed to send message. Please try again.",
            });
          }
        });
    },
    [state.activeSessionId, state.isStreaming]
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return (
    <ChatContext.Provider
      value={{
        state,
        createSession,
        selectSession,
        renameSession: handleRenameSession,
        deleteSession: handleDeleteSession,
        sendMessage: handleSendMessage,
        cancelStream,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

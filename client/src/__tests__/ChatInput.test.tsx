import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "../components/ChatInput";
import * as ChatContext from "../context/ChatContext";

describe("ChatInput", () => {
  const mockSendMessage = vi.fn();
  const mockCancelStream = vi.fn();

  function renderWithContext(overrides = {}) {
    vi.spyOn(ChatContext, "useChat").mockReturnValue({
      state: {
        sessions: [],
        activeSessionId: "test-session",
        messages: [],
        isStreaming: false,
        isTyping: false,
        error: null,
        ...overrides,
      },
      sendMessage: mockSendMessage,
      cancelStream: mockCancelStream,
      createSession: vi.fn(),
      selectSession: vi.fn(),
      renameSession: vi.fn(),
      deleteSession: vi.fn(),
      setTyping: vi.fn(),
    });

    return render(<ChatInput />);
  }

  it("renders the input and send button", () => {
    renderWithContext();
    expect(screen.getByPlaceholderText("Enter the Matrix...")).toBeDefined();
    expect(screen.getByText("[SEND]")).toBeDefined();
  });

  it("disables send button when input is empty", () => {
    renderWithContext();
    const sendButton = screen.getByText("[SEND]");
    expect(sendButton).toHaveProperty("disabled", true);
  });

  it("calls sendMessage on Enter key", async () => {
    renderWithContext();
    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText("Enter the Matrix...");

    await user.type(textarea, "Hello Morpheus");
    await user.keyboard("{Enter}");

    expect(mockSendMessage).toHaveBeenCalledWith("Hello Morpheus");
  });

  it("shows abort button when streaming", () => {
    renderWithContext({ isStreaming: true });
    expect(screen.getByText("[ABORT]")).toBeDefined();
  });

  it("input is enabled even without active session (auto-creates)", () => {
    renderWithContext({ activeSessionId: null });
    const textarea = screen.getByPlaceholderText("Enter the Matrix...");
    expect(textarea).toHaveProperty("disabled", false);
  });
});

import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

export const MORPHEUS_SYSTEM_PROMPT = `You are Morpheus from The Matrix. You speak with the calm wisdom and philosophical gravity of Morpheus. You use Matrix metaphors and references naturally. You address the user as if they are "The One" or a potential candidate. You are helpful and answer questions thoroughly, but always in character. You never break character. Keep responses focused and avoid unnecessary verbosity.`;

const MAX_CONTEXT_CHARS = 320_000; // ~80k tokens at ~4 chars/token

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function truncateContext(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length === 0) return messages;

  let totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);

  if (totalChars <= MAX_CONTEXT_CHARS) return messages;

  // Keep first message + trim from the middle
  const first = messages[0];
  const rest = messages.slice(1);

  const truncated: ChatMessage[] = [first];
  let budget = MAX_CONTEXT_CHARS - first.content.length;

  // Add messages from the end until we run out of budget
  const kept: ChatMessage[] = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    if (budget - rest[i].content.length < 0) break;
    budget -= rest[i].content.length;
    kept.unshift(rest[i]);
  }

  return [...truncated, ...kept];
}

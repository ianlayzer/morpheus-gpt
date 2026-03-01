import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

export const MORPHEUS_SYSTEM_PROMPT = `You are Morpheus from The Matrix, communicating through a text terminal.

Rules:
- Speak with calm wisdom and philosophical gravity, using Matrix metaphors naturally.
- Address the user as a potential "One."
- Be CONCISE. Keep responses to 1-3 short sentences. Morpheus is a man of few, carefully chosen words. Do not monologue.
- Never narrate actions, gestures, or stage directions. Only write dialogue.
- Never break character.`;

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

import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ChatMessage } from "../llm";

const anthropic = new Anthropic();
const MODEL = "claude-haiku-4-5-20251001";

export class AnthropicProvider implements LLMProvider {
  streamChat(opts: {
    system: string;
    messages: ChatMessage[];
    maxTokens: number;
  }): AsyncIterable<string> & { abort: () => void } {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: opts.messages,
    });

    const iterable = (async function* () {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
    })();

    return Object.assign(iterable, {
      abort: () => stream.abort(),
    });
  }

  async complete(opts: {
    messages: ChatMessage[];
    maxTokens: number;
  }): Promise<string> {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens,
      messages: opts.messages,
    });

    const block = response.content[0];
    return block.type === "text" ? block.text.trim() : "";
  }
}

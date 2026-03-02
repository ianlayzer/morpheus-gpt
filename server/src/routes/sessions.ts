import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import type { Message } from "@prisma/client";
import {
  anthropic,
  MORPHEUS_SYSTEM_PROMPT,
  truncateContext,
  ChatMessage,
} from "../lib/claude";
import { authMiddleware } from "../middleware/auth";

export const sessionRouter = Router();

// All session routes require authentication
sessionRouter.use(authMiddleware);

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

// GET /api/sessions — list non-deleted sessions
sessionRouter.get("/", async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { deletedAt: null, userId: req.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(sessions);
  } catch (err) {
    console.error("Failed to list sessions:", err);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

// POST /api/sessions — create new session
sessionRouter.post("/", async (req: Request, res: Response) => {
  try {
    const session = await prisma.session.create({ data: { userId: req.userId! } });
    res.status(201).json(session);
  } catch (err) {
    console.error("Failed to create session:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// PATCH /api/sessions/:id — rename session
const patchSchema = z.object({ title: z.string().min(1).max(200) });

sessionRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const session = await prisma.session.updateMany({
      where: { id: paramId(req), deletedAt: null, userId: req.userId },
      data: { title: parsed.data.title },
    });

    if (session.count === 0) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({ id: paramId(req), title: parsed.data.title });
  } catch (err) {
    console.error("Failed to rename session:", err);
    res.status(500).json({ error: "Failed to rename session" });
  }
});

// DELETE /api/sessions/:id — soft delete
sessionRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const result = await prisma.session.updateMany({
      where: { id: paramId(req), deletedAt: null, userId: req.userId },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete session:", err);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// GET /api/sessions/:id/messages — get messages for session
sessionRouter.get("/:id/messages", async (req: Request, res: Response) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: paramId(req), deletedAt: null, userId: req.userId },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { sessionId: paramId(req) },
      orderBy: { orderIndex: "asc" },
    });

    // Mark any leftover 'streaming' messages as 'error' (interrupted by server restart)
    const staleStreaming = messages.filter((m: Message) => m.status === "streaming");
    if (staleStreaming.length > 0) {
      await prisma.message.updateMany({
        where: {
          id: { in: staleStreaming.map((m: Message) => m.id) },
        },
        data: { status: "error" },
      });
      for (const m of messages) {
        if (m.status === "streaming") m.status = "error";
      }
    }

    res.json(messages);
  } catch (err) {
    console.error("Failed to get messages:", err);
    res.status(500).json({ error: "Failed to get messages" });
  }
});

// POST /api/sessions/:id/messages — send message + stream response
const messageSchema = z.object({ content: z.string().min(1) });

sessionRouter.post("/:id/messages", async (req: Request, res: Response) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const sessionId = paramId(req);

  try {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, deletedAt: null, userId: req.userId },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Get current message count for orderIndex
    const messageCount = await prisma.message.count({
      where: { sessionId },
    });

    // Insert user message
    const userMessage = await prisma.message.create({
      data: {
        sessionId,
        role: "user",
        content: parsed.data.content,
        orderIndex: messageCount,
      },
    });

    // Fetch conversation history
    const allMessages = await prisma.message.findMany({
      where: { sessionId, status: { in: ["complete"] } },
      orderBy: { orderIndex: "asc" },
    });

    const chatHistory: ChatMessage[] = allMessages.map((m: Message) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const truncatedHistory = truncateContext(chatHistory);

    // Create placeholder assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        sessionId,
        role: "assistant",
        content: "",
        orderIndex: messageCount + 1,
        status: "streaming",
      },
    });

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send user message event so client can confirm it
    res.write(
      `data: ${JSON.stringify({ type: "user_message", message: userMessage })}\n\n`
    );

    // Send assistant message placeholder
    res.write(
      `data: ${JSON.stringify({ type: "assistant_message", message: assistantMessage })}\n\n`
    );

    let fullContent = "";
    let aborted = false;

    try {
      const stream = anthropic.messages.stream({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: MORPHEUS_SYSTEM_PROMPT,
        messages: truncatedHistory,
      });

      // Handle client disconnect — abort the Anthropic stream
      req.on("close", () => {
        aborted = true;
        stream.abort();
      });

      for await (const event of stream) {
        if (aborted) break;

        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullContent += event.delta.text;
          res.write(
            `data: ${JSON.stringify({ type: "token", text: event.delta.text })}\n\n`
          );
        }
      }

      if (aborted) {
        // Client cancelled — save partial content
        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: { content: fullContent, status: "cancelled" },
        });
        return;
      }

      // Complete — save full content
      await prisma.message.update({
        where: { id: assistantMessage.id },
        data: { content: fullContent, status: "complete" },
      });

      // Update session timestamp
      await prisma.session.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);

      // Auto-generate title after first user message
      if (!session.title && messageCount === 0) {
        generateTitle(sessionId, parsed.data.content, fullContent, res);
      } else {
        res.end();
      }
    } catch (err) {
      console.error("Claude API error during streaming:", err);

      await prisma.message.update({
        where: { id: assistantMessage.id },
        data: { content: fullContent, status: "error" },
      });

      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Failed to generate response" })}\n\n`
      );
      res.end();
    }
  } catch (err) {
    console.error("Failed to process message:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process message" });
    } else {
      res.end();
    }
  }
});

async function generateTitle(
  sessionId: string,
  userMessage: string,
  assistantResponse: string,
  res: Response
) {
  try {
    const titleResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Generate a short title (max 6 words) for a conversation that starts with this exchange. Return ONLY the title, no quotes or punctuation.\n\nUser: ${userMessage}\nAssistant: ${assistantResponse.slice(0, 500)}`,
        },
      ],
    });

    const title =
      titleResponse.content[0].type === "text"
        ? titleResponse.content[0].text.trim()
        : "New Chat";

    await prisma.session.update({
      where: { id: sessionId },
      data: { title },
    });

    res.write(`data: ${JSON.stringify({ type: "title", title })}\n\n`);
  } catch (err) {
    console.error("Failed to generate title:", err);
  }

  res.end();
}

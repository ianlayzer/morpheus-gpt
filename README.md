# MorpheusGPT

A production-grade ChatGPT-like application themed as Morpheus from The Matrix. Chat with Morpheus who responds in-character with streaming token-by-token responses.

**Live demo**: [morpheus-gpt.com](https://morpheus-gpt.com)

## Architecture Overview

![Architecture Diagram](happy-path-design.png)

**Frontend**: React 19 + TypeScript (Vite), Tailwind CSS, react-markdown
**Backend**: Express + TypeScript, Prisma ORM, Zod validation
**Database**: SQLite (dev) / PostgreSQL (prod via Railway)
**LLM**: Claude API (Haiku for chat, Haiku for title generation)
**Auth**: bcrypt password hashing + JWT tokens (7-day expiry)

### Streaming Approach

The chat message endpoint (`POST /sessions/:id/messages`) uses **Server-Sent Events (SSE)**:
1. Client sends user message via POST with JWT auth header
2. Server inserts user message, creates a placeholder assistant message with `status: 'streaming'`
3. Server streams Claude API response token-by-token as SSE events
4. Client appends tokens to the assistant message in real-time
5. On completion, server updates the message to `status: 'complete'`
6. On cancel — client aborts the fetch, server detects disconnect and calls `stream.abort()` on the Anthropic SDK to stop generation and save partial content

SSE was chosen over WebSockets for simplicity — it's unidirectional (server→client) which matches this use case perfectly, works over standard HTTP, and is simpler to deploy.

### Data Model

```
User (id, username, passwordHash, createdAt)
  └── Session (id, title?, userId, createdAt, updatedAt, deletedAt?)
        └── Message (id, sessionId, role, content, orderIndex, status, createdAt)
```

Key design decisions:
- **User model**: Username/password auth with bcrypt hashing, JWT tokens for stateless auth
- **`userId` on Session**: Each user's sessions are fully isolated
- **`orderIndex`**: Deterministic message ordering independent of timestamps
- **`status`** on Message: Tracks streaming lifecycle (`streaming` → `complete` | `cancelled` | `error`)
- **`deletedAt`** on Session: Soft deletes preserve data for recovery
- **Composite index** on `(sessionId, orderIndex)` for efficient message retrieval

## Features

- Token-by-token streaming responses from Morpheus
- User authentication (register/login) with isolated sessions per user
- Session management (create, rename, soft-delete, switch)
- Auto-generated session titles (via Claude Haiku)
- Conversation context maintained across messages with truncation (~80k token limit)
- Cancel mid-stream — aborts both the client fetch and the Anthropic API call, saves partial content
- Interrupted stream detection on page reload (stale `streaming` messages marked as `error`)
- Markdown rendering in assistant responses
- Matrix-themed dark UI with CRT scanline effects, phosphor glow, and screen flicker
- Mobile responsive layout with collapsible sidebar
- Input zoom prevention on iOS (16px minimum font on mobile)
- Request logging middleware

## Failure & Edge Case Handling

- **LLM API failure mid-stream**: Partial content saved with `status: 'error'`, error event sent to client
- **User refresh during streaming**: On next load, stale `streaming` messages are detected and marked as `error`
- **Client disconnect/cancel**: Server aborts Anthropic stream immediately (saves API credits), partial content saved as `cancelled`
- **Very long conversations**: Context truncation drops oldest messages to fit within ~80k token window
- **Invalid/expired auth**: 401 returned, frontend redirects to login

## Tradeoffs & Deferred Work

### What was deferred
- **Retry/regenerate**: Could add a "regenerate" button for error/cancelled messages
- **Rate limiting**: No rate limiting on API endpoints — would add express-rate-limit
- **Optimistic updates**: Messages are added to UI only after server confirms via SSE
- **Message search**: No search across sessions

### What would change with more time
- Add WebSocket support for bidirectional communication (typing indicators)
- Implement message search across sessions
- Add export/import for conversation history
- Implement proper error boundaries in React
- Add E2E tests with Playwright
- Add OAuth providers (GitHub, Google) alongside username/password
- Add refresh token rotation for better security

### Where this might break at scale
- **In-memory context**: All messages loaded into memory for Claude API call — would need pagination/summarization for very long conversations
- **No connection pooling tuning**: Prisma handles basic pooling, but would need tuning under load
- **No CDN**: Static assets served directly — would add CloudFront/Vercel Edge
- **JWT secret rotation**: Single static secret — would need rotation strategy

## Production Considerations

### Bottlenecks
- Claude API latency is the primary bottleneck (~2-10s for first token)
- Database writes during streaming (message update on completion)

### Cost Drivers
- Claude API usage: Haiku for chat responses, Haiku for title generation
- Context window size directly impacts cost — truncation helps

### Security
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for stateless authentication (7-day expiry)
- API key stored in environment variables, never exposed to client
- Zod validation on all request bodies (auth, sessions, messages)
- SQL injection prevented by Prisma ORM
- XSS mitigated by React's default escaping + react-markdown
- CORS configured (would restrict origin in production)
- Session isolation — users can only access their own sessions

## Local Development Setup

### Prerequisites
- Node.js 20+
- An Anthropic API key

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd morpheus-gpt

# Set up environment
cp .env.example server/.env
# Edit server/.env and add your ANTHROPIC_API_KEY and JWT_SECRET

# Set up backend
cd server
npm install
npm run db:push   # pushes schema to local SQLite

# Start backend
npm run dev

# In another terminal — start frontend
cd client
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to `http://localhost:3001`.

### Database Migrations

Migrations are run manually (not on deploy):

```bash
# Local (SQLite)
cd server && npm run db:push

# Production (PostgreSQL) — set DATABASE_URL or pass inline
npm run db:push:prod
```

### Running Tests

```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```

## Time Allocation

- **Architecture & planning**: ~30 min
- **Backend (API, DB, streaming)**: ~2 hours
- **Frontend (UI, state, SSE client)**: ~2 hours
- **Authentication (JWT, auth pages)**: ~1 hour
- **Mobile polish & bug fixes**: ~30 min
- **Tests & documentation**: ~30 min

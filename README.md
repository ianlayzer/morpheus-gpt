# MorpheusGPT

A production-grade ChatGPT-like application themed as Morpheus from The Matrix. Chat with Morpheus who responds in-character with streaming token-by-token responses.

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌──────────┐
│  React + TS     │  SSE    │  Express + TS   │         │  Claude  │
│  (Vite)         │◄───────►│  REST API       │◄───────►│  API     │
│  Tailwind CSS   │         │  Prisma ORM     │         │          │
└─────────────────┘         └────────┬────────┘         └──────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  SQLite (dev) │
                              │  Postgres     │
                              │  (prod)       │
                              └──────────────┘
```

**Frontend**: React + TypeScript (Vite), Tailwind CSS, react-markdown for rendering
**Backend**: Express + TypeScript, Prisma ORM, Zod validation
**Database**: SQLite (dev) / PostgreSQL (prod via Railway)
**LLM**: Claude API (Sonnet for chat, Haiku for title generation)

### Streaming Approach

The chat message endpoint (`POST /api/sessions/:id/messages`) uses **Server-Sent Events (SSE)**:
1. Client sends user message via POST
2. Server inserts user message, creates a placeholder assistant message with `status: 'streaming'`
3. Server streams Claude API response token-by-token as SSE events
4. Client appends tokens to the assistant message in real-time
5. On completion, server updates the message to `status: 'complete'`
6. On cancel/error, server saves partial content with appropriate status

SSE was chosen over WebSockets for simplicity — it's unidirectional (server→client) which matches this use case perfectly, works over standard HTTP, and is simpler to deploy.

### Data Model

```
Session (id, title?, createdAt, updatedAt, deletedAt?)
  └── Message (id, sessionId, role, content, orderIndex, status, createdAt)
```

Key design decisions:
- **`orderIndex`**: Deterministic message ordering independent of timestamps
- **`status`** on Message: Tracks streaming lifecycle (`streaming` → `complete` | `cancelled` | `error`)
- **`deletedAt`** on Session: Soft deletes preserve data for recovery
- **No User model**: Simplified for this scope — auth would be the first addition for production
- **Composite index** on `(sessionId, orderIndex)` for efficient message retrieval

## Features

- Token-by-token streaming responses from Morpheus
- Session management (create, rename, delete, switch)
- Auto-generated session titles (via Claude Haiku)
- Conversation context maintained across messages
- Context truncation for long conversations (~80k token limit)
- Cancel mid-stream with partial content preserved
- Interrupted stream detection on page reload
- Markdown rendering in assistant responses
- Matrix-themed dark UI with green accents
- Request logging middleware

## Tradeoffs & Deferred Work

### What was deferred
- **Authentication**: No user model or auth — would add NextAuth or similar for production
- **Retry/regenerate**: Could add a "regenerate" button for error/cancelled messages
- **Rate limiting**: No rate limiting on API endpoints — would add express-rate-limit
- **Optimistic updates**: Messages are added to UI only after server confirms via SSE
- **Mobile responsive**: Sidebar doesn't collapse on mobile

### What would change with more time
- Add WebSocket support for bidirectional communication (typing indicators)
- Implement message search across sessions
- Add export/import for conversation history
- Implement proper error boundaries in React
- Add E2E tests with Playwright

### Where this might break at scale
- **SQLite**: Single-writer limitation — swapped to Postgres for production
- **In-memory context**: All messages loaded into memory for Claude API call — would need pagination/summarization for very long conversations
- **No connection pooling**: Prisma handles this, but would need tuning under load
- **No CDN**: Static assets served directly — would add CloudFront/Vercel Edge

## Production Considerations

### Bottlenecks
- Claude API latency is the primary bottleneck (~2-10s for first token)
- Database writes during streaming (message update on completion)

### Cost Drivers
- Claude API usage: Sonnet for chat responses, Haiku for title generation
- Context window size directly impacts cost — truncation helps

### Security
- API key stored in environment variables, never exposed to client
- Zod validation on all request bodies
- SQL injection prevented by Prisma ORM
- XSS mitigated by React's default escaping + react-markdown
- CORS configured (would restrict origin in production)

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
# Edit server/.env and add your ANTHROPIC_API_KEY

# Set up database
cd server
npm install
npx prisma migrate dev --schema ../prisma/schema.prisma

# Start backend
npm run dev

# In another terminal — start frontend
cd client
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to `http://localhost:3001`.

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
- **Integration & polish**: ~1 hour
- **Tests & documentation**: ~30 min

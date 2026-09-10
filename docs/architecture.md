# FundWise Architecture Document

## 1. System Overview

FundWise is architected as a decoupled client-server web application optimized for mobile viewports (responsive up to desktop screens with centered container max-width 448px):

```
+-------------------------------------------------------------+
|                      Client (React 18 + Vite)                |
|  - 13 pages (Dashboard, Voice, Receipt, Manual, Insights)   |
|  - Wouter Client-side Routing                               |
|  - Framer Motion micro-animations                           |
|  - Tailwind CSS + Radix/shadcn primitives                   |
|  - AppContext (Auth state, transactions cache, dark mode)   |
+------------------------------+------------------------------+
                               | HTTPS / HTTP Cookies
                               v
+-------------------------------------------------------------+
|               API Server (Node.js + Express + TS)           |
|  +-------------------------------------------------------+  |
|  | Middlewares: Auth/Session, RateLimiter, ErrorHandler   |  |
|  +-------------------------------------------------------+  |
|  | Routes: /api/auth, /api/transactions, /api/ai, etc.   |  |
|  +-------------------------------------------------------+  |
|  | Services: AuthService, TransactionService, AiService  |  |
|  +-------------------------------------------------------+  |
|  | Database Layer: Drizzle ORM (PostgreSQL / SQLite)     |  |
|  +-------------------------------------------------------+  |
+------------------------------+------------------------------+
                               |
            +------------------+------------------+
            |                                     |
            v                                     v
+------------------------+             +----------------------+
| Database (PostgreSQL)  |             | OpenAI Cloud API     |
| - Users & Sessions     |             | - Whisper-1 (STT)    |
| - Transactions         |             | - GPT-4o-mini Vision |
| - Overrides & Activity |             | - GPT-4o-mini JSON   |
+------------------------+             +----------------------+
```

---

## 2. Backend Design Principles

1. **Separation of Concerns**:
   - `routes/`: HTTP routing, input decoding, status codes.
   - `services/`: Domain business logic, database queries, AI invocations.
   - `middlewares/`: Cross-cutting concerns (authentication, role checks, rate limiting, error catching).
   - `db/`: Entity schemas, migration scripts, connection pooling.
   - `types/`: Zod validation schemas and TypeScript interfaces.

2. **Security & Session Management**:
   - Password hashing uses Node's native `crypto.scrypt` with random 16-byte salt and timing-safe comparison.
   - Sessions are identified via 32-byte cryptographically random tokens stored in an HTTP-only, SameSite cookie (`fw_session`).
   - Tokens in the database are hashed with SHA-256 to prevent compromise in case of read-only DB exfiltration.
   - Admin roles are verified via session lookup and optional environment allowlist (`ADMIN_EMAILS`).

3. **Resilient AI Pipeline**:
   - All AI routes (`/api/ai/*`) require authentication to prevent resource abuse.
   - Built-in rate limiting mitigates denial-of-wallet risks.
   - Graceful offline fallback: if `OPENAI_API_KEY` is not present, rule-based categorization and parsing ensure zero friction during local testing.

---

## 3. Frontend Architecture

- **Rendering Engine**: React 18 with Vite for near-instant HMR and production bundle optimization.
- **Routing**: `wouter` lightweight client-side router matching all 13 canonical screens.
- **Styling**: Tailwind CSS with customized color palettes tailored for high-contrast light/dark mode and Egyptian currency (EGP).
- **State Management**: Centralized React context (`AppContext`) caching user profile, transaction list, dark mode state, and merchant category overrides.
- **Visual Micro-Interactions**: Framer motion transitions for smooth card expansion, bottom sheet sliding, and confirmation badges.

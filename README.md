# FundWise AI — Production Rebuild

FundWise AI is a mobile-first personal finance application tailored for the Egyptian market (EGP currency). It enables rapid expense capture through four distinct channels:
1. **Voice Note Capture**: High-accuracy speech-to-text with entity extraction.
2. **Smart Receipt OCR**: Vision-based line item and merchant extraction.
3. **QR Code Scanning**: Instant QR payload parsing for merchant and transaction details.
4. **Manual Entry**: Interactive form with real-time, debounced AI category classification.

---

## Key Highlights of this Rebuild

- **Backend**: Node.js + Express + TypeScript in a modular, layered architecture (`routes/`, `services/`, `middlewares/`, `db/`).
- **Frontend**: React 18 + Vite + TypeScript, strictly preserving 100% of the original mobile UI/UX, animations (`framer-motion`), styling (`tailwind` + `shadcn/ui`), and all 13 screens.
- **AI Integration**: Real Whisper-1 and GPT-4o-mini pipelines with session authentication, rate-limiting, and offline rule-based fallbacks.
- **Data Integrity**: Clean relational schema (PostgreSQL via Drizzle ORM / SQLite fallback for zero-friction local testing).
- **Security**: Scrypt password hashing, HTTP-only session cookies with SHA-256 hashed tokens, role-based access control (RBAC), and sanitization.

---

## Directory Structure

```
FundWise-Production/
├── client/                     # React 18 + Vite + TypeScript (13 screens)
│   ├── src/
│   │   ├── components/         # Reusable UI & ConfirmationCard
│   │   ├── pages/              # Dashboard, Voice, Receipt, Manual, Admin, etc.
│   │   ├── contexts/           # AppContext (Auth, Transactions, Dark Mode)
│   │   └── data/               # Seed categories, colors, alternatives
│   ├── index.html
│   └── vite.config.ts
│
├── server/                     # Node.js + Express + TypeScript API Server
│   ├── src/
│   │   ├── db/                 # Drizzle schemas, migrations & connection pool
│   │   ├── routes/             # Auth, Transactions, AI, Dashboard, Admin
│   │   ├── services/           # Business logic & OpenAI services
│   │   ├── middlewares/        # Session auth, rate limiter, error handling
│   │   └── types/              # Domain models & Zod validation schemas
│   └── tsconfig.json
│
├── docs/                       # Architecture, AI pipelines, setup guides
├── .env.example
├── package.json
└── README.md
```

---

## Quick Start

### 1. Prerequisites
- Node.js >= 18 (Node.js 20+ recommended)
- npm (or pnpm)

### 2. Setup Environment
```bash
cp .env.example .env
```
Add your `OPENAI_API_KEY` (optional: offline fallback is available if omitted).

### 3. Install Dependencies
```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 4. Run Development Servers
```bash
npm run dev
```
- Client runs at: `http://localhost:5173`
- Server API runs at: `http://localhost:3000`

---

## Documentation
- [Architecture Guide](file:///c:/Users/User/Documents/FundWise/FundWise-Production/docs/architecture.md)
- [AI Architecture & Pipelines](file:///c:/Users/User/Documents/FundWise/FundWise-Production/docs/ai-architecture.md)
- [Migration Notes & Bug Fixes](file:///c:/Users/User/Documents/FundWise/FundWise-Production/docs/migration-notes.md)
- [Setup & Deployment](file:///c:/Users/User/Documents/FundWise/FundWise-Production/docs/setup.md)

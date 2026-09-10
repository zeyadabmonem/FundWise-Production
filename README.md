<div align="center">

# 💰 FundWise AI

### Smart Expense Tracker — Built for the Egyptian Market

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-17%2F17%20Passing-22c55e?style=for-the-badge&logo=checkmarx&logoColor=white)](#testing)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](LICENSE)

FundWise is a mobile-first personal finance app that lets users capture expenses in seconds via **voice**, **receipt photo**, **QR code**, or **manual entry** — with AI-powered automatic categorization.

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎤 **Voice Capture** | Speak your expense — Whisper-1 transcribes and extracts merchant + amount |
| 📷 **Receipt OCR** | Photograph a receipt — GPT-4o vision extracts line items and totals |
| 📱 **QR Scanner** | Scan payment QR codes for instant transaction entry |
| ✍️ **Manual Entry** | Type merchant name — AI auto-suggests category in real time |
| 📊 **Dashboard** | Month-over-month spend comparison with dynamic AI insight chips |
| 📈 **Insights** | Donut & bar charts breaking down spend by category and time |
| 🔒 **Admin Panel** | Role-gated dashboard for user management and activity feed |
| 🌙 **Dark Mode** | Glassmorphism dark-first design with smooth theme transitions |
| 🇪🇬 **EGP-Native** | Seeded with real Egyptian merchants (Carrefour, Vodafone, Uber, etc.) |

---

## 🏗️ Architecture

```
FundWise-Production/
│
├── server/                          # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/                  # Env vars, ADMIN_EMAILS, feature flags
│   │   ├── db/
│   │   │   ├── schema/              # 6 Drizzle ORM schemas
│   │   │   │   ├── users.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── transactions.ts
│   │   │   │   ├── overrides.ts     # Per-user merchant→category mappings
│   │   │   │   ├── activity.ts
│   │   │   │   └── exports.ts
│   │   │   ├── connection.ts        # PostgreSQL connection pool (Drizzle)
│   │   │   └── storage.ts           # Proxy: PgStorage ↔ MemStorage fallback
│   │   ├── middlewares/
│   │   │   ├── auth.ts              # HTTP-only cookie sessions, requireUser/Admin
│   │   │   ├── errorHandler.ts      # Zod errors → 400, AppError, 500 fallback
│   │   │   └── rateLimit.ts         # 10 req/15min per IP on auth routes
│   │   ├── routes/
│   │   │   ├── auth.ts              # /register /login /logout /me
│   │   │   ├── transactions.ts      # CRUD + AI categorization on create
│   │   │   ├── dashboard.ts         # MoM spend + AI insight chips
│   │   │   ├── overrides.ts         # Merchant override persistence
│   │   │   ├── ai.ts                # /categorize /transcribe /ocr
│   │   │   ├── admin.ts             # User mgmt, activity feed, exports
│   │   │   └── health.ts            # /healthz
│   │   ├── services/
│   │   │   ├── aiService.ts         # OpenAI (GPT-4o-mini + Whisper-1) + fallback
│   │   │   └── dashboardService.ts  # Spend aggregation, MoM delta, insights
│   │   ├── types/index.ts           # Domain models + Zod validation schemas
│   │   ├── app.ts                   # Express app wiring
│   │   └── index.ts                 # Server entry point
│   └── test/
│       └── api.test.ts              # 17 automated API tests
│
├── client/                          # React 18 + Vite 6 + TypeScript
│   └── src/
│       ├── components/
│       │   ├── ui/                  # 40+ shadcn/ui components (Radix UI based)
│       │   ├── TopBar.tsx
│       │   ├── BottomNav.tsx
│       │   ├── TransactionRow.tsx
│       │   ├── ConfirmationCard.tsx # AI confidence + approve/edit flow
│       │   └── CategoryBadge.tsx
│       ├── pages/                   # 13 screens (see full list below)
│       ├── contexts/AppContext.tsx  # Global state + API sync
│       ├── hooks/                   # use-mobile, use-toast
│       ├── data/seedData.ts         # Local demo data (offline mode)
│       └── index.css                # Tailwind v4 + CSS custom properties
│
├── docs/                            # Architecture and setup guides
├── .env.example                     # Environment variable template
└── package.json                     # Monorepo workspace root
```

---

## 🖥️ Screens (13 total)

| Route | Screen | Description |
|---|---|---|
| `/` | Splash | Animated logo, auto-redirect |
| `/auth` | Auth | Login + Register with tab switch |
| `/dashboard` | Dashboard | MoM spend, category bars, AI insights |
| `/transactions` | Transactions | Searchable, filterable full list |
| `/transactions/:id` | Detail | View + edit a single transaction |
| `/manual` | Manual Entry | Form with AI auto-categorize on blur |
| `/voice` | Voice | MediaRecorder → Whisper-1 transcription |
| `/receipt` | Receipt OCR | Camera/file → GPT-4o vision extraction |
| `/qr` | QR Scanner | Device camera QR code parsing |
| `/insights` | Insights | Donut + bar charts by category/month |
| `/settings` | Settings | Profile, merchant overrides, theme |
| `/admin` | Admin | User mgmt, activity feed *(admin only)* |
| `*` | 404 | Friendly not-found page |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** `>= 18.0.0` (v20 LTS recommended)
- **npm** `>= 9`
- **OpenAI API Key** *(optional — offline fallback works without it)*

### 1. Clone & Install

```bash
git clone https://github.com/zeyadabmonem/FundWise-Production.git
cd FundWise-Production

# Install all workspaces
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Configure Environment

```bash
cp .env.example server/.env
```

Edit `server/.env`:

```env
# Required
SESSION_SECRET=your-long-random-secret-here

# Optional — app works without these (offline fallback active)
DATABASE_URL=postgresql://user:password@localhost:5432/fundwise
OPENAI_API_KEY=sk-...

# Optional — comma-separated emails that get admin role on login
ADMIN_EMAILS=admin@fundwise.eg,you@example.com
```

### 3. Run Development Servers

```bash
# Terminal 1 — API server (http://localhost:3000)
npm run dev --prefix server

# Terminal 2 — React app (http://localhost:5173)
npm run dev --prefix client
```

> **Zero-config mode**: Without `DATABASE_URL`, the server uses an in-memory store pre-seeded with 35 Egyptian transactions and 2 demo users. No setup needed.

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| 👤 Regular User | `demo@fundwise.eg` | `password123` |
| 🛡️ Admin | `admin@fundwise.eg` | `password123` |

---

## 🧪 Testing

```bash
npm test --prefix server
```

**17/17 tests passing** using Node.js built-in test runner (`tsx --test`):

```
▶ FundWise Production API Suite
  ✔ GET /api/healthz returns status ok
  ▶ Authentication Flow
    ✔ POST /register creates member user + session cookie
    ✔ GET /me returns 401 without cookie
    ✔ GET /me returns user with valid cookie
    ✔ POST /login authenticates demo user
    ✔ POST /login authenticates admin user
  ▶ Transactions Flow
    ✔ POST /transactions creates transaction + learns merchant
    ✔ GET /transactions returns list
    ✔ PATCH /transactions/:id updates transaction
  ▶ Dashboard Summary
    ✔ Returns MoM spend delta and AI insight chips
  ▶ Merchant Overrides
    ✔ GET returns user overrides
    ✔ POST upserts merchant→category override
  ▶ AI Endpoints
    ✔ Rejects unauthenticated requests with 401
    ✔ Categorizes known merchants with confidence score
    ✔ Uses user override before AI inference
  ▶ Admin Access Control
    ✔ Rejects regular member with 403
    ✔ Allows admin user

✔ 17 tests | 0 failures | ~322ms
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account, receive session cookie |
| `POST` | `/api/auth/login` | — | Login, receive session cookie |
| `POST` | `/api/auth/logout` | ✓ | Destroy session |
| `GET` | `/api/auth/me` | ✓ | Get current user profile |

### Transactions
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/transactions` | ✓ | List all user transactions |
| `POST` | `/api/transactions` | ✓ | Create transaction (triggers AI categorize) |
| `GET` | `/api/transactions/:id` | ✓ | Get single transaction |
| `PATCH` | `/api/transactions/:id` | ✓ | Update transaction |
| `DELETE` | `/api/transactions/:id` | ✓ | Delete transaction |

### Dashboard & AI
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | ✓ | MoM spend, categories, AI insights |
| `POST` | `/api/ai/categorize` | ✓ | Categorize merchant name |
| `POST` | `/api/ai/transcribe` | ✓ | Transcribe audio via Whisper-1 |
| `POST` | `/api/ai/ocr` | ✓ | Extract data from receipt image |

### Merchant Overrides
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/merchant-overrides` | ✓ | Get user's custom mappings |
| `POST` | `/api/merchant-overrides` | ✓ | Save merchant→category override |

### Admin *(admin role required)*
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/overview` | Admin | Stats, all users, activity feed |
| `GET` | `/api/admin/users` | Admin | List all users |
| `PATCH` | `/api/admin/users/:id` | Admin | Update user role/status/plan |
| `GET` | `/api/admin/transactions` | Admin | All transactions across users |
| `POST` | `/api/admin/export` | Admin | Create export record |

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/healthz` | `{status, database, uptime, timestamp}` |

---

## 🔒 Security

| Mechanism | Implementation |
|---|---|
| **Passwords** | Node.js `scrypt` (memory-hard, salted) |
| **Sessions** | HTTP-only cookie, SHA-256 hashed token, 7-day expiry |
| **RBAC** | `requireUser` + `requireAdmin` middleware on every protected route |
| **Rate Limiting** | 10 requests / 15 min per IP on auth routes |
| **Input Validation** | Zod schemas on all request bodies |
| **CORS** | Credential-aware, origin-restricted in production |

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **ORM**: Drizzle ORM (PostgreSQL / in-memory fallback)
- **AI**: OpenAI SDK (GPT-4o-mini, Whisper-1, GPT-4o vision)
- **Validation**: Zod
- **Logging**: Pino + pino-http
- **File Upload**: Multer

### Frontend
- **Framework**: React 18 + Vite 6
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 + CSS custom properties
- **Components**: shadcn/ui (Radix UI primitives)
- **Charts**: Recharts
- **Routing**: React Router v6
- **State**: React Context + useReducer

---

## 📁 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | API server port |
| `SESSION_SECRET` | Yes | — | Secret for signing session tokens |
| `DATABASE_URL` | No | — | PostgreSQL connection string (in-memory if omitted) |
| `OPENAI_API_KEY` | No | — | OpenAI key (rule-based fallback if omitted) |
| `ADMIN_EMAILS` | No | — | Comma-separated emails promoted to admin on login |
| `NODE_ENV` | No | `development` | `development` or `production` |

---

## 📄 License

MIT © 2026 FundWise

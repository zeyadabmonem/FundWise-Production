<div align="center">

# 💰 FundWise

### Expense Tracker — Built for the Egyptian Market

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-17%2F17%20Passing-22c55e?style=for-the-badge&logo=checkmarx&logoColor=white)](#testing)
[![Gemini](https://img.shields.io/badge/AI-Gemini%20Flash%20Vision-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](LICENSE)

FundWise is a mobile-first personal finance application tailored for the Egyptian economy (EGP). It empowers users to capture expenses in seconds via **voice**, **receipt photo**, **QR code**, or **manual entry** — featuring hybrid AI that operates 100% locally offline or connects to Google Gemini / OpenAI for high precision.

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎤 **Voice & Dialect Capture** | Speak in Egyptian Arabic or English — AI extracts store, amount, and category accurately |
| 📷 **Receipt Vision OCR** | Snap Egyptian receipt photos — powered by Gemini Flash Vision (+98% accuracy) with local Tesseract.js fallback |
| 📱 **QR Code Scanner** | Live camera video feed or photo upload to parse merchant payment QR codes |
| ✍️ **Manual Entry** | Clean form with instant auto-categorization and manual override controls |
| 🤖 **In-App AI Engine Manager** | Manage free Gemini / OpenAI API keys directly in Settings without touching code |
| 📊 **Dashboard** | Month-over-month spend comparison with dynamic AI insight chips |
| 📈 **Insights & Analytics** | Interactive donut & bar charts categorizing your spending across time |
| 🔒 **Admin Workspace** | Role-gated administration console for user management and platform health |
| 🌙 **Dark & Light Modes** | Modern glassmorphism UI with smooth theme switching |
| 🇪🇬 **EGP-Native** | Built-in knowledge of Egyptian merchants (Carrefour, Vodafone, Uber, Seoudi, Cilantro, etc.) |

---

## 🏗️ Architecture

```
FundWise-Production/
│
├── server/                          # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/                  # Env vars, ADMIN_EMAILS, GEMINI_API_KEY
│   │   ├── db/
│   │   │   ├── schema/              # Drizzle ORM schemas (Users, Transactions, Overrides, etc.)
│   │   │   ├── connection.ts        # PostgreSQL pool connection
│   │   │   └── storage.ts           # Storage abstraction (PostgreSQL ↔ In-memory fallback)
│   │   ├── middlewares/             # Auth sessions, error handling, rate limiting
│   │   ├── routes/
│   │   │   ├── auth.ts              # /register, /login, /logout, /me
│   │   │   ├── transactions.ts      # Full CRUD with smart category tagging
│   │   │   ├── dashboard.ts         # Spend analytics & MoM summary
│   │   │   ├── ai.ts                # /status, /parse-text, /scan-receipt, /categorize
│   │   │   ├── admin.ts             # User admin & activity logging
│   │   │   └── health.ts            # /healthz health check
│   │   └── services/
│   │       ├── aiService.ts         # Gemini Flash Vision + OpenAI + Offline fallbacks
│   │       └── dashboardService.ts  # Monthly spend aggregation & analytics
│   └── test/
│       └── api.test.ts              # 17 automated API integration tests
│
├── client/                          # React 18 + Vite + TypeScript Frontend
│   └── src/
│       ├── components/              # TopBar, BottomNav, ConfirmationCard, shadcn/ui
│       ├── pages/                   # 13 polished responsive pages
│       │   ├── ReceiptPage.tsx      # Dual-engine Receipt scanner (AI Vision + Tesseract)
│       │   ├── VoicePage.tsx        # Egyptian speech & text dialect parser
│       │   ├── QrPage.tsx           # Live camera video barcode/QR scanner
│       │   ├── SettingsPage.tsx     # In-app AI key configuration & user preferences
│       │   └── AdminDashboardPage   # System monitoring & user control
│       ├── contexts/AppContext.tsx  # Global state, theme, transaction cache, AI headers
│       └── index.css                # Tailored design system with CSS custom tokens
│
├── .env.example                     # Environment configuration template
└── package.json                     # Monorepo workspace configuration
```

---

## 🤖 AI Hybrid Architecture

FundWise features a **dual-layer AI architecture** providing both maximum accuracy and complete zero-friction offline reliability:

```
                      ┌───────────────────────────────┐
                      │   User Input (Receipt/Voice)  │
                      └──────────────┬────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
       [AI Key Configured?]              [No Key / Offline?]
                    │                                 │
                    ▼                                 ▼
       Google Gemini Flash Vision         Local Browser Engine
       • +98% OCR accuracy                • Tesseract.js (Receipts)
       • Egyptian slang NLP               • Web Speech API (Voice)
       • Structured JSON in < 2s          • Local Regex categorizer
```

### 🆓 How to Get a Free Google Gemini API Key
1. Visit **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. Click **Create API Key** (100% free, up to 15 requests/minute).
3. Open FundWise ➡️ **Settings** ➡️ Paste your key and click **Save API Keys**.
4. That's it! Instant high-precision AI vision and Egyptian dialect comprehension.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18 or newer
- **npm** or **pnpm**

### 1. Clone & Install
```bash
git clone https://github.com/zeyadabmonem/FundWise-Production.git
cd FundWise-Production
npm run install:all
```

### 2. Configure Environment (Optional)
```bash
cp .env.example server/.env
# Edit server/.env to optionally add your GEMINI_API_KEY or DATABASE_URL
```

### 3. Run Development Servers
```bash
# Terminal 1 - Backend API Server (Port 3000)
npm run dev --prefix server

# Terminal 2 - Frontend Client (Port 5173 / 5174)
npm run dev --prefix client
```

Open your browser at **`http://localhost:5173`** or **`http://localhost:5174`**.

---

## 🧪 Testing

Run the automated backend test suite:
```bash
npm run test --prefix server
```

```text
✔ 17 tests | 0 failures | Passing
  ▶ Authentication Flow
  ▶ Transactions CRUD
  ▶ Dashboard & Insights
  ▶ AI Endpoints & Overrides
  ▶ Admin RBAC Access Control
```

---

## 📡 API Reference

### AI Endpoints
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ai/status` | ✓ | Returns active AI engine & server key status |
| `POST` | `/api/ai/scan-receipt` | ✓ | Vision OCR receipt scanner (Gemini / OpenAI / Fallback) |
| `POST` | `/api/ai/parse-text` | ✓ | Egyptian dialect & NLP expense parser |
| `POST` | `/api/ai/categorize` | ✓ | Auto-categorizes merchant name with confidence rating |
| `POST` | `/api/ai/transcribe` | ✓ | Audio file transcription via Whisper |

### Auth & Transactions
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register account with session cookie |
| `POST` | `/api/auth/login` | — | Login with email and password |
| `GET` | `/api/auth/me` | ✓ | Get current session user profile |
| `GET` | `/api/transactions` | ✓ | List all user transactions |
| `POST` | `/api/transactions` | ✓ | Create transaction with AI categorization |
| `PATCH` | `/api/transactions/:id` | ✓ | Update transaction |
| `DELETE` | `/api/transactions/:id` | ✓ | Delete transaction |
| `GET` | `/api/dashboard/summary` | ✓ | MoM spending deltas and AI insights |
| `GET` | `/api/admin/overview` | Admin | System statistics, users, and platform activity |

---

## 📄 License

MIT © [Zeyad Abdelmonem](https://github.com/zeyadabmonem)

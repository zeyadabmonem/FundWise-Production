# FundWise Setup & Deployment Guide

## Prerequisites
- Node.js version 18.0 or higher (v20+ recommended)
- npm version 9.0 or higher
- PostgreSQL (optional: SQLite fallback runs automatically if PostgreSQL is not active)

---

## Local Development Setup

### 1. Clone or Open the Repository
Ensure you are in the `FundWise-Production/` directory.

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your secrets:
- `SESSION_SECRET`: A secure 64-char string.
- `OPENAI_API_KEY`: Your OpenAI API key with access to `whisper-1` and `gpt-4o-mini`.
- `DATABASE_URL`: Your PostgreSQL connection string.

### 3. Install Dependencies
```bash
# In FundWise-Production root
npm install
npm install --prefix server
npm install --prefix client
```

### 4. Run Development Server
```bash
npm run dev
```
- Client runs at: `http://localhost:5173`
- Backend API runs at: `http://localhost:3000`

---

## Production Build & Run

```bash
# Build both frontend and backend
npm run build

# Start production server
npm run start
```

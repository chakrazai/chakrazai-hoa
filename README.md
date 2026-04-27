# HOAConnect — Full Stack Application

A production-ready HOA management platform with React frontend, Node.js/Express backend, and PostgreSQL database.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT (JSON Web Tokens) |
| Payments | Stripe (ACH + Card) |
| Email | SendGrid |
| SMS | Twilio |
| Physical Mail | Lob.com |
| Hosting (Frontend) | Vercel |
| Hosting (Backend) | Railway or Render |
| Database Hosting | Supabase or Railway |

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/hoa-platform.git
cd hoa-platform

# Install frontend deps
cd frontend && npm install

# Install backend deps
cd ../backend && npm install
```

### 2. Set up environment variables

```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env
```

Fill in your values (see Environment Variables section below).

### 3. Set up the database

```bash
cd backend
npm run db:migrate   # creates all tables
npm run db:seed      # adds sample data
```

### 4. Start development servers

```bash
# Terminal 1 — backend (http://localhost:3001)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## Project Structure

```
hoa-platform/
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   ├── pages/              # One file per route/page
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # API client, utilities
│   │   └── data/               # Mock data (dev only)
│   ├── .env.example
│   └── package.json
│
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── routes/             # API route handlers
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── db/                 # Database migrations + seeds
│   │   └── services/           # Business logic (email, SMS, Stripe)
│   ├── .env.example
│   └── package.json
│
├── docs/                       # Architecture docs
├── .github/workflows/          # CI/CD (auto deploy on push)
└── README.md
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
VITE_API_URL=http://localhost:3001
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### Backend (`backend/.env`)

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hoa_platform

# Auth
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Lob (Physical Mail)
LOB_API_KEY=...
```

---

## Deployment

### Deploy Frontend to Vercel

```bash
cd frontend
npm run build
npx vercel --prod
```

Or connect your GitHub repo to Vercel — it auto-deploys on every push to `main`.

### Deploy Backend to Railway

1. Go to [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Select the `backend/` folder
4. Add your environment variables in the Railway dashboard
5. Railway auto-provisions a PostgreSQL database if you add the plugin

### Deploy Backend to Render

1. Go to [render.com](https://render.com)
2. "New Web Service" → connect GitHub
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables
6. Add a "PostgreSQL" database from Render dashboard

---

## GitHub Setup

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit — HOAConnect full stack"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/hoa-platform.git
git branch -M main
git push -u origin main
```

---

## API Reference

Base URL: `http://localhost:3001/api`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login, returns JWT |
| GET | `/communities` | List user's communities |
| GET | `/communities/:id/dashboard` | Dashboard metrics |
| GET | `/dues` | Dues & delinquencies |
| POST | `/dues/payment` | Record payment |
| GET | `/compliance` | Compliance alerts |
| GET | `/violations` | Open violations |
| POST | `/violations` | Create violation |
| GET | `/maintenance` | Work orders |
| POST | `/maintenance` | Create work order |
| GET | `/vendors` | Vendor directory |
| GET | `/residents` | Resident directory |
| GET | `/documents` | Document list |
| POST | `/communications/send` | Send announcement |
| GET | `/accounting/summary` | Financial summary |
| GET | `/tax/documents` | Tax documents |

Full API docs: `docs/api.md`

# HOAConnect — Step-by-Step Setup Guide

## Step 1: Put the code on GitHub

```bash
# Open Terminal (Mac) or Command Prompt (Windows)
cd hoa-fullstack

git init
git add .
git commit -m "Initial commit — HOAConnect full stack"
```

Then:
1. Go to github.com → click "New repository"
2. Name it `hoa-platform`
3. Copy the two lines it shows you (starting with `git remote add origin...`)
4. Paste and run them in your terminal

---

## Step 2: Set up a database (free with Supabase)

1. Go to **supabase.com** → create free account
2. "New Project" → name it `hoa-platform`
3. Copy the **"Connection string"** from Settings → Database
4. It looks like: `postgresql://postgres:yourpassword@db.xxx.supabase.co:5432/postgres`
5. Save this — you'll need it below

---

## Step 3: Deploy the backend (free with Railway)

1. Go to **railway.app** → sign in with GitHub
2. "New Project" → "Deploy from GitHub repo"
3. Select your `hoa-platform` repo → select the `backend/` folder
4. Click "Add Variables" and add:
   ```
   DATABASE_URL    = (your Supabase connection string from Step 2)
   JWT_SECRET      = (any long random string, e.g. generate at random.org)
   NODE_ENV        = production
   FRONTEND_URL    = https://your-app.vercel.app  (add this after Step 4)
   ```
5. Railway gives you a URL like `https://hoa-backend.up.railway.app`

Run migrations to create tables:
- In Railway dashboard → your backend service → "Shell" tab
- Type: `npm run db:migrate && npm run db:seed`

---

## Step 4: Deploy the frontend (free with Vercel)

1. Go to **vercel.com** → sign in with GitHub
2. "Add New Project" → import your `hoa-platform` repo
3. Change Root Directory to `frontend`
4. Add environment variables:
   ```
   VITE_API_URL              = https://hoa-backend.up.railway.app
   VITE_STRIPE_PUBLIC_KEY    = pk_test_... (from Stripe dashboard)
   ```
5. Click "Deploy" → Vercel gives you a live URL!

---

## Step 5: Set up Stripe payments (optional)

1. Go to **stripe.com** → create account
2. Dashboard → Developers → API Keys
3. Copy your **Publishable key** (starts with `pk_`) → add to Vercel env vars
4. Copy your **Secret key** (starts with `sk_`) → add to Railway env vars as `STRIPE_SECRET_KEY`

---

## Step 6: Set up email (optional, free tier)

1. Go to **sendgrid.com** → create account
2. Settings → API Keys → Create API Key
3. Add to Railway env vars:
   ```
   SENDGRID_API_KEY      = SG.your_key
   SENDGRID_FROM_EMAIL   = noreply@yourdomain.com
   ```

---

## Your app is now live!

- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://hoa-backend.up.railway.app`
- **Login**: admin@demo.com / password123 (change immediately!)

Every time you push code to GitHub → it auto-deploys to Vercel and Railway.

---

## Local development

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env   # fill in your values
npm install
npm run db:migrate
npm run db:seed
npm run dev            # runs on http://localhost:3001

# Terminal 2 — frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev            # runs on http://localhost:5173
```

# Deployment Guide: Migrating to Vercel & Connecting Backend

This guide will help you migrate your Frontend to **Vercel** and connect it to your **Backend** (NestJS).

## 1. Backend Deployment (Prerequisite)

Before deploying the frontend, ensure your backend is live so you have the `API_URL`.

Your backend is configured for **Railway** (`railway.json` is present). This is an excellent choice for NestJS.

### **Option A: Deploy to Railway (Recommended for NestJS)**
1.  Go to [Railway.app](https://railway.app/) and create a new project.
2.  Connect your GitHub repository.
3.  Railway should automatically detect the configuration from `apps/backend/railway.json`.
4.  **Important**: Set your Environment Variables in Railway (e.g., `DATABASE_URL` for Prisma).
5.  Once deployed, copy your backend URL (e.g., `https://backend-production.up.railway.app`).

### **Option B: Deploy to Render (Free Tier Alternative)**
If you want a free tier for the backend:
1.  Go to [Render.com](https://render.com/).
2.  Create a "Web Service".
3.  Connect your repo.
4.  **Root Directory**: `apps/backend`
5.  **Build Command**: `npm install && npx prisma migrate deploy && npm run build`
6.  **Start Command**: `npm run start:prod`
7.  Add Environment Variables (`DATABASE_URL`, etc.).

---

## 2. Frontend Deployment (Vercel)

We have updated `next.config.ts` to support Vercel's standard deployment (SSR/ISR + Image Optimization).

### **Step 1: Install Vercel CLI**
Open your terminal in the project root:
```bash
npm install -g vercel
```

### **Step 2: Login**
```bash
vercel login
```

### **Step 3: Deploy**
Run the deploy command from the **root** of your workspace:

```bash
vercel
```

Follow the interactive prompts:

1.  **Set up and deploy?** `Y`
2.  **Which scope?** (Select your account)
3.  **Link to existing project?** `N` (Create a new one)
4.  **Project Name**: `foundercfo-frontend` (or your choice)
5.  **In which directory is your code located?**: `apps/frontend`
    *   ⚠️ **Critical**: Tyoe `apps/frontend` and hit Enter. Do not leave it as `./`.
6.  **Want to modify these settings?** `N`
    *   It should auto-detect Next.js.

### **Step 4: Configure Environment Variables**
The CLI might ask for environment variables during deployment, or you can add them in the Vercel Dashboard later.

You **MUST** set the `NEXT_PUBLIC_API_URL` to point to your live backend.

**Via Dashboard:**
1.  Go to your project on Vercel.
2.  Settings -> Environment Variables.
3.  Add `NEXT_PUBLIC_API_URL` with your backend URL (e.g., `https://your-backend.up.railway.app` or `https://api.your-domain.com`).
    *   *Note: Do not add a trailing slash (e.g. use `https://api.com`, not `https://api.com/`).*

**Via CLI (Redeploy):**
If you already deployed, run this to update the env var and redeploy:
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter the value when prompted
vercel --prod
```

## 3. Verify Connection

1.  Open your new Vercel deployment URL.
2.  Open the Browser Console (F12).
3.  Try to log in or fetch data.
4.  Check the Network tab to ensure requests are going to your **Backend URL** (not `localhost`).
5.  Ensure your Backend has **CORS** enabled (It is currently enabled in `apps/backend/src/main.ts`).

---

### Comparison Summary
| Service | Component | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Vercel** | Frontend (Next.js) | ✅ Ready | Best for Next.js. `output: export` removed for full features. |
| **Railway** | Backend (NestJS) | ✅ Ready | Config file `railway.json` exists. Best tailored for this repo. |

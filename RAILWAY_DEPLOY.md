# Deploy Backend to Railway

## Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"

## Step 2: Deploy from GitHub
1. Click "Deploy from GitHub repo"
2. Select your `CFO` repository
3. Railway will auto-detect it's a Node.js app

## Step 3: Configure Backend
1. Click on your service
2. Go to "Variables" tab
3. Add these environment variables:

```
DATABASE_URL=<Railway will auto-fill this>
REDIS_URL=<Railway will auto-fill this>
JWT_SECRET=avFU+IRODmUYjgc4nMrgdD86/ka4B209zV69yzNTpBBkFKzhRKjkHTIVBjWdZit2I+sK0sC2cTmz1P0LfJ/sVw==
GEMINI_API_KEY=AIzaSyD2-6KaIPRVWRIL8L0n6C7NkYtOjT8K19U
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
FRONTEND_URL=https://your-netlify-site.netlify.app
```

## Step 4: Add PostgreSQL Database
1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically link it to your backend
3. DATABASE_URL will be auto-configured

## Step 5: Add Redis (Optional but recommended)
1. Click "New" → "Database" → "Add Redis"
2. REDIS_URL will be auto-configured

## Step 6: Configure Build Settings
1. Go to "Settings" tab
2. Set:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm run start:prod`

## Step 7: Deploy
1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Copy your backend URL (e.g., `https://cfo-production.up.railway.app`)

## Step 8: Update Netlify Environment Variable
1. Go to Netlify dashboard
2. Site Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL` to your Railway backend URL
4. Trigger a new deploy

✅ Done! Your frontend will now connect to the live backend.

## Troubleshooting

**Build fails?**
- Check Railway logs for errors
- Ensure `apps/backend/package.json` has all dependencies

**Database connection fails?**
- Railway auto-configures DATABASE_URL
- Run migrations: `npx prisma migrate deploy`

**CORS errors?**
- Ensure `ALLOWED_ORIGINS` includes your Netlify URL

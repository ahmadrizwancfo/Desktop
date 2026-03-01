# Netlify Deployment (Web UI / Git)

This guide helps you deploy your frontend to Netlify using the **Dashboard** (No CLI required), just like a standard setup.

## 1. Verify Code Configuration

We have restored your `apps/frontend/next.config.ts` to use **Static Export**, which is what you had previously.

**Key Config in `next.config.ts`:**
```typescript
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true }, // Required for static export
};
```

We also added a `netlify.toml` in `apps/frontend/` to ensure Netlify automatically knows to deploy the `out` folder.

## 2. Option A: Connect via GitHub (Recommended)

1.  Push your latest code to GitHub.
2.  Log in to [Netlify.com](https://app.netlify.com) with your **NEW** email.
3.  Click **"Add new site"** > **"Import from existing project"**.
4.  Select **GitHub**.
5.  Pick your `CFO` repository.
6.  **Configuration**:
    *   **Base directory**: `apps/frontend`
    *   **Build command**: `npm run build`
    *   **Publish directory**: `out` (Netlify might default to `.next`, change it to `out`).
        *   *Note: The `netlify.toml` file we added matches these settings, so it might auto-fill correctly.*

## 3. Option B: Drag & Drop (Manual)

1.  In your terminal (inside `apps/frontend`), run:
    ```bash
    npm run build
    ```
    This creates an `out` folder.
2.  Log in to [Netlify.com](https://app.netlify.com) with your **NEW** email.
3.  Click **"Add new site"** > **"Deploy manually"**.
4.  Drag the `out` folder from your file explorer onto the drop zone.

## 4. Connect Backend (Environment Variables)

Once the site is created, you must connect it to your backend.

1.  Go to **Site Settings** > **Configuration** > **Environment variables**.
2.  Add a new variable:
    *   **Key**: `NEXT_PUBLIC_API_URL`
    *   **Value**: Your Live Backend URL (e.g., `https://your-backend.railway.app`) OR `http://localhost:3000` (if just testing locally).
3.  **IMPORTANT**: Because this is a static site, you must **Trigger a new deploy** for the variable to take effect.
    *   Go to **Deploys** > **Trigger deploy** > **Deploy site**.

✅ **Done!** Your site should now be live and connected.

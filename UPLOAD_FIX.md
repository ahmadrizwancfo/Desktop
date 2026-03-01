# FounderCFO - Upload Not Working? Quick Fix Guide

## Problem
File uploads are failing with "Failed to parse PDF" or similar errors.

## Root Cause
The **database is not running** because Docker Desktop is not started.

## Solution (Choose One)

### Option 1: Start Docker (Recommended)
1. Open **Docker Desktop** from your Applications folder
2. Wait for the whale icon to appear in your menu bar (top-right)
3. Run the startup script:
   ```bash
   ./scripts/start-dev.sh
   ```

### Option 2: Use the Demo/Fallback Mode
If you don't want to start Docker right now:

1. When you see an upload error, click **"Try Sample Data Instead"**
2. This will show you a demo analysis without needing the database
3. All features will work in demo mode

### Option 3: Switch to SQLite (No Docker Needed)
If you want a permanent solution without Docker:

1. Run the SQLite migration script:
   ```bash
   ./scripts/use-sqlite.sh
   ```
2. This will reconfigure the app to use SQLite (a file-based database)
3. No Docker required!

## Verification

After starting Docker, verify it's working:
```bash
docker ps
```

You should see containers for `postgres` and `redis`.

## Still Having Issues?

Check the backend logs:
```bash
cd apps/backend
npm run start:dev
```

Look for database connection errors.

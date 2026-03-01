# Update Your Deployment

Since we've made changes to the backend code to fix Tally uploads and improve PDF error handling, you need to push these changes to GitHub so Railway can redeploy them.

## Step 1: Push Changes to GitHub

Run these commands in your terminal:

```bash
git add .
git commit -m "fix: Improve Tally, PDF and Excel parsing reliability"
git push origin main
```

## Step 2: Watch Railway Deploy

1. Open your Railway Dashboard.
2. You'll see a new build starting automatically.
3. Wait for it to finish (~2-3 minutes).

## Step 3: Verify

Once deployment is active, try uploading:
1. **Tally XML**: Should now show revenue/expense numbers on the dashboard.
2. **Scanned PDF**: Should now warn you to upload an image instead of failing silently.
3. **Excel**: Should parse correctly.

## Common Issues

**If uploads still fail:**
- Check your Railway "Variables". Ensure `GEMINI_API_KEY` is set correctly.
- Ensure your Excel file format is `.xlsx` and not an older `.xls` binary if possible (though `.xls` is supported, `.xlsx` is more reliable).

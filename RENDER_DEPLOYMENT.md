# Render Deployment Guide

This guide explains how to deploy the A World Marketing backend to Render.

## Prerequisites

- A GitHub repository with the code
- A Render account (https://render.com)
- A Supabase database (or other PostgreSQL database accessible from Render)

## Step-by-Step Deployment

### 1. Create a Render Web Service

1. Log in to your Render dashboard
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Select the repository containing your code

### 2. Configure the Service

In the Render dashboard, fill in the following details:

- **Name**: `a-world-marketing-api` (or your preferred name)
- **Region**: Select closest to your users
- **Branch**: `main`
- **Root Directory**: `server` (important!)
- **Runtime**: Node.js
- **Build Command**: `npm install; npm run build`
- **Start Command**: `npm start`

### 3. Add Environment Variables

In the Render dashboard, go to the "Environment" section and add:

```
DATABASE_URL=postgresql://user:password@db.xxxxxxx.supabase.co:5432/postgres
PORT=10000
NODE_ENV=production
ACCESS_TOKEN_SECRET=your-long-random-secret-key-here
REFRESH_TOKEN_SECRET=your-long-random-secret-key-here
CLIENT_URL=https://your-client-domain.com
FRONTEND_URL=https://your-frontend-domain.com
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### Important Notes on DATABASE_URL:

- For Supabase, the format is: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`
- If your password contains special characters, they must be URL-encoded (e.g., `@` becomes `%40`, space becomes `%20`)
- Ensure your Supabase database allows connections from Render
  - In Supabase: Project Settings → Database → Connection pooling → Enable and use pooled connection

### 4. Database Setup

Before deploying, ensure your database is set up:

1. **Run migrations on Supabase**:
   - Locally: `npx prisma db push`
   - Or in Render's build logs, migrations run automatically

2. **Seed initial data** (optional):
   - This happens automatically if admin doesn't exist
   - Default admin: `admin@me.com` / `123456` (change immediately in production!)

### 5. Deploy

1. Click "Deploy" in Render
2. Monitor the deployment in the "Logs" tab
3. Once deployment completes, your service will be live

## Troubleshooting

### Database Connection Error

**Error**: "Can't reach database server at `db.xxxxx.supabase.co:5432`"

**Solutions**:
1. Verify DATABASE_URL is correct in Render environment variables
2. Check that Supabase allows external connections (enable in settings)
3. Verify the password is correctly URL-encoded in the DATABASE_URL
4. Test the connection locally first before deploying
5. Check Supabase firewall rules if applicable

### Port Not Detected

**Error**: "No open ports detected"

**Solution**: This is fixed in the updated code. The server now binds to a port immediately and initializes the database asynchronously. If you still see this error:
1. Check the "Start Command" is `npm start`
2. Ensure NODE_ENV is not preventing the server from starting

### Server Crashes on Deploy

**Possible causes**:
1. DATABASE_URL not set
2. Database not accessible
3. Missing environment variables

**Solution**: The server now handles database initialization errors gracefully. Check the deploy logs for specific errors.

## After Deployment

### Update Environment Variables

1. Change the default admin password:
   - Login with `admin@me.com` / `123456`
   - Update password immediately

2. Update CLIENT_URL and FRONTEND_URL to your production domains

3. Update Stripe keys to production keys if using Stripe

### Configure CORS

The server CORS is configured to allow:
- `http://localhost:3000`
- `http://localhost:3001`
- Your `CLIENT_URL` environment variable

For production, ensure your frontend URL is set in CLIENT_URL.

## Monitoring

In Render dashboard:
- View real-time logs
- Monitor metrics and performance
- Set up alerts for errors
- Enable auto-deploys on GitHub push

## Updating Deployment

To redeploy after code changes:
1. Push changes to GitHub
2. Render will auto-deploy if auto-deploy is enabled
3. Or manually trigger deployment from Render dashboard

## Health Check

Test your deployment:

```bash
curl https://your-render-url.onrender.com/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

## Support

For issues:
- Check Render documentation: https://render.com/docs
- Check Supabase documentation: https://supabase.com/docs
- Review application logs in Render dashboard

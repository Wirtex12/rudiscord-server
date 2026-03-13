# Voxit - Deployment Guide

## Deploy Backend to Render.com

### 1. Create PostgreSQL Database

1. Go to https://render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name:** `voxit-db`
   - **Region:** `Frankfurt` (or closest to you)
   - **Plan:** `Free`
   - **Database Name:** `voxit`
4. Click **"Add Database"**
5. **Copy "Internal Database URL"** (you'll need it later)

### 2. Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `voxit-backend`
   - **Region:** `Frankfurt` (same as database)
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Plan:** `Free`

### 3. Add Environment Variables

In the Render dashboard, add these environment variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | (from PostgreSQL Internal Database URL) |
| `JWT_SECRET` | (generate random string, e.g., `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_REFRESH_SECRET` | (another random string) |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `CORS_ORIGIN` | `*` (or your frontend URL) |
| `SOCKET_CORS_ORIGIN` | `*` |
| `SOCKET_PORT` | `3001` |

### 4. Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Copy the URL (e.g., `https://voxit-backend.onrender.com`)

### 5. Test Backend

Open in browser:
- `https://your-backend-url.onrender.com/api/health`
- Should return: `{"status":"ok","timestamp":"...","uptime":...}`

### 6. Update Client

1. Open `client/src/config.ts`
2. Update URLs:
```typescript
export const API_URL = 'https://voxit-backend.onrender.com';
export const SOCKET_URL = 'https://voxit-backend.onrender.com';
```

3. Rebuild client:
```bash
cd client
npm run electron:build
```

4. Publish new release to GitHub

### 7. Auto-Update Configuration

In `client/package.json`, update:
```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "YOUR_GITHUB_USERNAME",
    "repo": "voxit"
  }
}
```

---

## Troubleshooting

### Backend won't start

Check logs in Render dashboard:
```
Logs → View Logs
```

Common issues:
- Missing environment variables
- Database connection failed
- Port not set to 3000

### Database connection error

Make sure you're using the **Internal Database URL**, not the external one.

### CORS errors

Update `CORS_ORIGIN` to include your frontend URL:
```
CORS_ORIGIN=https://your-app.com
```

### Socket.io connection failed

Make sure `SOCKET_CORS_ORIGIN` matches your frontend URL.

---

## Free Plan Limitations

- **Web Service:** 750 hours/month (free tier)
- **Database:** 1GB storage, 25MB memory
- **Auto-sleep:** Service sleeps after 15 minutes of inactivity
- **Wake-up time:** ~30 seconds on first request

To prevent sleep, use a service like [UptimeRobot](https://uptimerobot.com/) to ping your backend every 14 minutes.

---

## Production Checklist

- [ ] PostgreSQL database created
- [ ] Web service created
- [ ] All environment variables set
- [ ] Backend health check passes
- [ ] Client URLs updated
- [ ] Client rebuilt and published
- [ ] Auto-update configured
- [ ] CORS restricted to production URLs
- [ ] Database backups enabled (Render Pro feature)

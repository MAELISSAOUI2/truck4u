# 🚀 Truck4u Deployment Guide

## 📋 Pre-Deployment Checklist

- [ ] PostgreSQL database provisioned
- [ ] Redis instance setup
- [ ] S3/R2 bucket created
- [ ] Domain names configured
- [ ] SSL certificates ready
- [ ] Environment variables prepared
- [ ] Paymee account setup
- [ ] Flouci account setup
- [ ] SMS service (Twilio) configured

## 🗄️ Database Setup

### 1. Provision PostgreSQL

**Option A: Railway**
```bash
railway add postgresql
# Copy DATABASE_URL from dashboard
```

**Option B: Supabase**
```bash
# Create project at supabase.com
# Copy connection string from Settings > Database
```

**Option C: Self-hosted**
```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install postgresql-15
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb truck4u
```

### 2. Run Migrations

```bash
cd packages/database
export DATABASE_URL="your-database-url"
yarn db:push
```

### 3. Seed Initial Data (Optional)

```bash
yarn db:seed
```

## 📦 Redis Setup

**Option A: Railway**
```bash
railway add redis
# Copy REDIS_URL from dashboard
```

**Option B: Redis Cloud**
- Sign up at redis.com
- Create free database
- Copy connection string

**Option C: Self-hosted**
```bash
sudo apt install redis-server
sudo systemctl start redis
# Default: redis://localhost:6379
```

## ☁️ Storage Setup (S3/R2)

### Cloudflare R2 (Recommended)

1. Go to Cloudflare dashboard
2. Navigate to R2
3. Create bucket: `truck4u-production`
4. Create API token with R2 read/write
5. Configure CORS:

```json
[
  {
    "AllowedOrigins": ["https://truck4u.tn", "https://api.truck4u.tn"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

6. Set environment variables:
```bash
S3_ENDPOINT=https://YOUR-ACCOUNT-ID.r2.cloudflarestorage.com
S3_BUCKET=truck4u-production
AWS_ACCESS_KEY_ID=your-r2-access-key
AWS_SECRET_ACCESS_KEY=your-r2-secret-key
S3_PUBLIC_URL=https://cdn.truck4u.tn
```

### AWS S3 Alternative

```bash
# Create bucket
aws s3 mb s3://truck4u-production

# Configure CORS
aws s3api put-bucket-cors --bucket truck4u-production --cors-configuration file://cors.json

# Set public access policy
aws s3api put-bucket-policy --bucket truck4u-production --policy file://policy.json
```

## 🔐 Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/truck4u
REDIS_URL=redis://host:6379

# Server
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://truck4u.tn
API_URL=https://api.truck4u.tn

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-generated-secret-key

# Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
S3_BUCKET=truck4u-production
S3_PUBLIC_URL=https://cdn.truck4u.tn

# Paymee
PAYMEE_API_URL=https://api.paymee.tn
PAYMEE_API_KEY=your-paymee-api-key
PAYMEE_WEBHOOK_SECRET=your-webhook-secret

# Flouci
FLOUCI_API_URL=https://developers.flouci.com
FLOUCI_APP_PUBLIC=your-app-public
FLOUCI_APP_SECRET=your-app-secret

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+216XXXXXXXX

# Web Push (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:contact@truck4u.tn
```

### Frontend (.env)

```bash
NEXT_PUBLIC_API_URL=https://api.truck4u.tn
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```

## 🚀 Backend Deployment (Railway)

### 1. Install Railway CLI

```bash
npm install -g railway
railway login
```

### 2. Initialize Project

```bash
cd apps/api
railway init
```

### 3. Configure Build

Create `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "yarn install && yarn build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 4. Add Environment Variables

```bash
railway variables set DATABASE_URL="postgresql://..."
railway variables set REDIS_URL="redis://..."
# ... add all other variables
```

### 5. Deploy

```bash
railway up
```

### 6. Custom Domain

```bash
railway domain
# Add custom domain: api.truck4u.tn
```

## 🌐 Frontend Deployment (Vercel)

### 1. Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 2. Deploy

```bash
cd apps/web
vercel
```

### 3. Configure Environment Variables

In Vercel dashboard:
- Go to Settings > Environment Variables
- Add all NEXT_PUBLIC_* variables
- Redeploy

### 4. Custom Domain

```bash
vercel domains add truck4u.tn
# Configure DNS:
# CNAME: truck4u.tn -> cname.vercel-dns.com
```

### 5. Enable PWA Features

Ensure in vercel.json:
```json
{
  "headers": [
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

## 🔄 CI/CD Setup (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: yarn install
      - run: cd apps/api && yarn build
      - uses: railwayapp/railway@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: api

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: yarn install
      - run: cd apps/web && yarn build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 🔍 Monitoring Setup

### 1. Error Tracking (Sentry)

```bash
yarn add @sentry/node @sentry/nextjs
```

Backend (apps/api/src/index.ts):
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

Frontend (apps/web/sentry.config.js):
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

### 2. Uptime Monitoring

Use UptimeRobot or Better Uptime:
- Monitor: https://api.truck4u.tn/health
- Alert on: Response time > 2s, Status != 200
- Check interval: 5 minutes

### 3. Performance Monitoring

**Backend**: Use PM2 with monitoring

```bash
npm install -g pm2
pm2 start dist/index.js --name truck4u-api
pm2 monitor
```

**Frontend**: Use Vercel Analytics (built-in)

## 🔒 Security Hardening

### 1. SSL/TLS

- Enforce HTTPS redirects
- Use strong cipher suites
- Enable HSTS

### 2. Rate Limiting

Already implemented in code, but add Cloudflare rate limiting:
- Login endpoints: 5 requests/15min
- API endpoints: 100 requests/15min

### 3. DDoS Protection

Enable Cloudflare DDoS protection on both domains.

### 4. Database Backups

**Railway**: Automatic daily backups
**Manual**:
```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### 5. Secrets Management

Use environment variables, never commit:
- `.env` files in `.gitignore`
- Use secret managers in production

## 📊 Post-Deployment Checks

- [ ] Health endpoint responding: /health
- [ ] Database migrations applied
- [ ] Redis connection working
- [ ] File uploads working (S3/R2)
- [ ] WebSocket connections stable
- [ ] Payment webhooks receiving data
- [ ] SMS/OTP working
- [ ] Push notifications working
- [ ] PWA installable on mobile
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Error tracking working
- [ ] Monitoring alerts set

## 🐛 Troubleshooting

### Issue: Database Connection Timeout

```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Verify firewall rules allow connections
# Check DATABASE_URL format
```

### Issue: WebSocket Connection Failed

```bash
# Verify CORS settings
# Check if WebSocket port is open
# Ensure wss:// protocol in production
```

### Issue: File Uploads Not Working

```bash
# Verify S3 credentials
# Check bucket CORS policy
# Validate file size limits
```

### Issue: Payment Webhook Not Receiving

```bash
# Verify webhook URL is publicly accessible
# Check webhook signature validation
# Review Paymee/Flouci dashboard logs
```

## 📈 Scaling Strategy

### Phase 1: <1000 daily rides
- Single API server
- Shared database
- Current setup sufficient

### Phase 2: 1000-5000 daily rides
- Load balancer (Nginx)
- 2-3 API instances
- Database read replicas
- Redis cluster

### Phase 3: >5000 daily rides
- Microservices architecture
- Message queue (RabbitMQ)
- Separate WebSocket servers
- CDN for static assets
- Multi-region deployment

## 📞 Support Contacts

- **Infrastructure**: DevOps team
- **Database**: DBA team
- **Payments**: Paymee/Flouci support
- **Emergency**: On-call rotation

---

Last updated: 2024

# VivGAI — Deploy Guide

## What's Done ✅
- Full Next.js 14 app with semantic search UI
- Venice API integration (scrape, embed, chat)
- PostgreSQL + pgvector schema
- API routes: articles, search, semantic, scrape, cron, sources
- Pushed to GitHub: https://github.com/vivgatesAI/vivgai

## Deploy to Railway (Manual Steps)

Since the Railway token expired, you'll need to do this in the Railway dashboard:

### 1. Create Project
1. Go to https://railway.app → New Project
2. Choose "Deploy from GitHub repo" → select `vivgatesAI/vivgai`
3. This creates the web service

### 2. Add PostgreSQL
1. In the same project, click "New" → "Database" → "PostgreSQL"
2. Railway auto-generates a `DATABASE_URL` variable

### 3. Enable pgvector
1. Go to the PostgreSQL service → "Variables" tab
2. Note the DATABASE_URL value
2. Open the PostgreSQL terminal (Query tab) and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Set Environment Variables
On the web service, add:
- `VENICE_API_KEY` = your Venice API key
- `DATABASE_URL` = (auto-linked from PostgreSQL)
- `NEXT_PUBLIC_APP_URL` = your Railway URL (e.g. `https://vivgai-production.up.railway.app`)

### 5. Initialize Database
Once deployed, run the schema migration:
```bash
# In the PostgreSQL Query tab, run the contents of prisma/migrations/init/migration.sql
```

Or the app will auto-push via `prisma db push` in the start command.

### 6. Set Up Cron Job
1. In the Railway project, add a "Cron Job" service
2. Schedule: `0 10 * * 1-5` (Mon-Fri 10:00 UTC = 5:00 AM EST)
3. Command: `curl -s https://YOUR-RAILWAY-URL/api/cron`
4. Or use a GitHub Action / external cron to hit the endpoint

### 7. First Scrape
After deploying, trigger the initial scrape:
```bash
curl -X POST https://YOUR-RAILWAY-URL/api/scrape
```

This will harvest all 6 articles from gaiinsights.com, chunk them, embed them, and store in PostgreSQL.

## Local Development
```bash
cd vivgai
npm install
# Set up local PostgreSQL with pgvector
npx prisma db push
npm run dev
# Then visit http://localhost:3001
```
# VivGAI — AI Article Intelligence

Harvest articles from [gaiinsights.com](https://gaiinsights.com/articles), store with vector embeddings, and query with semantic search + AI summaries.

## Features

- **Auto-Scrape** — Harvests 6 daily AI articles via Venice `/augment/scrape`
- **Semantic Search** — Query articles with natural language using vector embeddings (pgvector)
- **AI Summaries** — Venice chat generates cited summaries from relevant chunks
- **Keyword Search** — Traditional text search as fallback
- **Clean UI** — Dark theme search interface

## Tech Stack

- **Next.js 14** — App Router + API Routes
- **PostgreSQL + pgvector** — Vector storage on Railway
- **Prisma** — ORM with vector support
- **Venice AI** — Scraping, embeddings (BGE-M3), and chat (Gemma 4)

## Local Development

```bash
npm install
npx prisma db push
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/articles` | GET | List all harvested articles |
| `GET /api/sources` | GET | List sources with counts |
| `GET /api/search?q=keyword` | GET | Keyword search |
| `GET /api/semantic?q=query&summarize=true` | GET | Semantic vector search + AI summary |
| `POST /api/scrape` | POST | Trigger scrape (or pass `{urls: [...]}`) |
| `GET /api/cron` | GET/POST | Auto-scrape (Railway cron, M-F 5AM EST) |

## Auto-Scrape Schedule

Railway cron job hits `GET /api/cron` Monday–Friday at 5:00 AM EST (10:00 UTC).

## Deployment

Push to GitHub → Railway auto-deploys. Set these env vars:
- `VENICE_API_KEY`
- `DATABASE_URL` (auto-set by Railway Postgres)
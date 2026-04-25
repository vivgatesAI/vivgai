#!/bin/bash
set -e

# Push Prisma schema
npx prisma db push --skip-generate

# Add pgvector extension and embedding column if missing
node scripts/migrate-db.mjs

# Start the app
exec next start
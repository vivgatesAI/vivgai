import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  console.log('Running database migrations...')

  // Add pgvector extension
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`)
  console.log('✅ pgvector extension ready')

  // Create tables if they don't exist
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      content_md TEXT NOT NULL,
      content_length INTEGER NOT NULL,
      scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      content_hash VARCHAR(32) NOT NULL
    )
  `)
  console.log('✅ articles table ready')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS chunks (
      id SERIAL PRIMARY KEY,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      embedding vector(1024)
    )
  `)
  console.log('✅ chunks table ready')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS scrape_logs (
      id SERIAL PRIMARY KEY,
      articles_found INTEGER NOT NULL DEFAULT 0,
      articles_new INTEGER NOT NULL DEFAULT 0,
      scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'success'
    )
  `)
  console.log('✅ scrape_logs table ready')

  // Add embedding column if missing (idempotent)
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding vector(1024)`)
    console.log('✅ embedding column ready')
  } catch (e) {
    console.log('embedding column may already exist:', e.message)
  }

  // Create indexes
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_chunks_article_id ON chunks(article_id)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_articles_scraped_at ON articles(scraped_at DESC)`)

  // Create HNSW index (only if there are embeddings; requires data or empty table)
  try {
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops)`)
    console.log('✅ HNSW index ready')
  } catch (e) {
    console.log('HNSW index note:', e.message?.slice(0, 100))
  }

  // Add new columns for ratings if they don't exist
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS rating TEXT`)
    console.log('✅ rating column ready')
  } catch (e) {
    console.log('rating column may already exist:', e.message?.slice(0, 80))
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS rated_date DATE`)
    console.log('✅ rated_date column ready')
  } catch (e) {
    console.log('rated_date column may already exist:', e.message?.slice(0, 80))
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS rationale TEXT`)
    console.log('✅ rationale column ready')
  } catch (e) {
    console.log('rationale column may already exist:', e.message?.slice(0, 80))
  }

  // Add indexes for filtering
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_articles_rating ON articles(rating)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_articles_rated_date ON articles(rated_date DESC)`)

  await prisma.$disconnect()
  console.log('Migration complete!')
}

migrate().catch(e => {
  console.error('Migration failed:', e)
  process.exit(1)
})
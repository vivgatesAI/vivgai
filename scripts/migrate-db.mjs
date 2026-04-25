import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  // Add pgvector extension
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`)
  console.log('✅ pgvector extension ready')

  // Add embedding column if missing
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding vector(1024)`)
    console.log('✅ embedding column ready')
  } catch (e) {
    console.log('embedding column may already exist:', e.message)
  }

  // Create HNSW index if not exists
  try {
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops)`)
    console.log('✅ HNSW index ready')
  } catch (e) {
    console.log('HNSW index may already exist:', e.message)
  }

  await prisma.$disconnect()
  console.log('Migration complete!')
}

migrate().catch(e => {
  console.error('Migration failed:', e)
  process.exit(1)
})
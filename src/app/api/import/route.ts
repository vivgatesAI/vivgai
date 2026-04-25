/**
 * POST /api/import
 * Import articles from CSV data with ratings
 * Body: { articles: [{ url, title, date, rating, rationale }] }
 * Processes in batches, skips existing, scrapes + embeds new ones
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { veniceScrape, veniceEmbed, chunkText, extractTitle, extractSource, contentHash } from '@/lib/venice'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const articles: Array<{ url: string; title: string; date: string; rating: string; rationale: string }> = body.articles

  if (!Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ error: 'Missing articles array' }, { status: 400 })
  }

  let imported = 0
  let skipped = 0
  let errors = 0
  const results: Array<{ url: string; status: string }> = []

  const BATCH_SIZE = 5
  
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE)
    
    for (const article of batch) {
      const url = article.url.replace(/\\/g, '').replace(/\u005c/g, '')
      
      try {
        // Check if already exists
        const existing = await prisma.article.findUnique({ where: { url } })
        if (existing) {
          // Update rating if we have one
          if (article.rating && !existing.rating) {
            await prisma.article.update({
              where: { id: existing.id },
              data: {
                rating: article.rating,
                ratedDate: article.date ? new Date(article.date + 'T00:00:00Z') : null,
                rationale: article.rationale || null,
              }
            })
          }
          skipped++
          results.push({ url, status: 'skipped' })
          continue
        }

        // Scrape the article
        const data = await veniceScrape(url)
        const contentMd = data.content || ''
        
        if (contentMd.length < 100) {
          errors++
          results.push({ url, status: 'too_short' })
          continue
        }

        const title = extractTitle(contentMd)
        const source = extractSource(url)
        const hash = contentHash(contentMd)

        const newArticle = await prisma.article.create({
          data: {
            url,
            title,
            source,
            contentMd,
            contentLength: contentMd.length,
            contentHash: hash,
            rating: article.rating || null,
            ratedDate: article.date ? new Date(article.date + 'T00:00:00Z') : null,
            rationale: article.rationale || null,
          },
        })

        // Chunk and embed
        const textChunks = chunkText(contentMd)
        if (textChunks.length > 0) {
          const embeddings = await veniceEmbed(textChunks)
          for (let j = 0; j < textChunks.length; j++) {
            const embeddingStr = `[${embeddings[j].join(',')}]`
            await prisma.$executeRaw`
              INSERT INTO chunks (article_id, chunk_index, chunk_text, embedding)
              VALUES (${newArticle.id}, ${j}, ${textChunks[j]}, ${embeddingStr}::vector)
            `
          }
        }

        imported++
        results.push({ url, status: 'imported' })
      } catch (err) {
        console.error(`Error importing ${url}:`, err)
        errors++
        results.push({ url, status: 'error' })
      }
    }

    // Rate limit: wait between batches
    if (i + BATCH_SIZE < articles.length) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  return NextResponse.json({ total: articles.length, imported, skipped, errors, results })
}
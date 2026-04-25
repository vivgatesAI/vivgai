/**
 * POST /api/import
 * Import articles from CSV data with ratings
 * Body: { articles: [{ url, title, date, rating, rationale }] }
 * Attempts to scrape; falls back to saving metadata-only if scrape fails
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
  let metadataOnly = 0
  let errors = 0
  const results: Array<{ url: string; status: string }> = []

  for (const article of articles) {
    const url = article.url.replace(/\\/g, '')
    
    try {
      // Check if already exists
      const existing = await prisma.article.findUnique({ where: { url } })
      if (existing) {
        // Update rating/rationale if we have one and existing doesn't
        if (article.rating) {
          await prisma.article.update({
            where: { id: existing.id },
            data: {
              rating: article.rating,
              ratedDate: article.date ? new Date(article.date + 'T00:00:00Z') : null,
              rationale: article.rationale || existing.rationale || null,
            }
          })
        }
        skipped++
        results.push({ url, status: 'skipped' })
        continue
      }

      let contentMd = ''
      let scrapeSucceeded = false

      try {
        const data = await veniceScrape(url)
        contentMd = data.content || ''
        if (contentMd.length >= 100) {
          scrapeSucceeded = true
        }
      } catch (scrapeErr) {
        console.error(`Scrape failed for ${url}:`, scrapeErr instanceof Error ? scrapeErr.message : 'unknown')
      }

      if (scrapeSucceeded) {
        const title = extractTitle(contentMd) || article.title
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
        try {
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
        } catch (embedErr) {
          console.error(`Embedding failed for ${url}:`, embedErr instanceof Error ? embedErr.message : 'unknown')
          // Article is still saved, just without embeddings
        }

        imported++
        results.push({ url, status: 'imported' })
      } else {
        // Save with metadata only (no content scraped)
        const source = extractSource(url)
        await prisma.article.create({
          data: {
            url,
            title: article.title || url,
            source,
            contentMd: '',
            contentLength: 0,
            contentHash: contentHash(url),
            rating: article.rating || null,
            ratedDate: article.date ? new Date(article.date + 'T00:00:00Z') : null,
            rationale: article.rationale || null,
          },
        })

        metadataOnly++
        results.push({ url, status: 'metadata_only' })
      }
    } catch (err) {
      console.error(`Error importing ${url}:`, err instanceof Error ? err.message : 'unknown')
      errors++
      results.push({ url, status: 'error' })
    }
  }

  return NextResponse.json({ 
    total: articles.length, imported, skipped, metadataOnly, errors, results 
  })
}
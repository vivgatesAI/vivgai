import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fetchArticleUrls, veniceScrape, veniceEmbed, chunkText, extractTitle, extractSource, contentHash } from '@/lib/venice'

export async function GET() {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json({ message: 'Skipping — weekend', dayOfWeek })
  }

  console.log(`[CRON] Auto-scrape triggered at ${now.toISOString()}`)

  try {
    const articleUrls = await fetchArticleUrls()
    console.log(`[CRON] Found ${articleUrls.length} articles`)

    let newCount = 0, skipCount = 0, errorCount = 0

    for (const url of articleUrls) {
      const existing = await prisma.article.findUnique({ where: { url } })
      if (existing) { skipCount++; continue }

      try {
        const data = await veniceScrape(url)
        const contentMd = data.content || ''
        if (contentMd.length < 100) continue

        const title = extractTitle(contentMd)
        const source = extractSource(url)
        const hash = contentHash(contentMd)

        const article = await prisma.article.create({
          data: { url, title, source, contentMd, contentLength: contentMd.length, contentHash: hash },
        })

        const textChunks = chunkText(contentMd)
        if (textChunks.length > 0) {
          const embeddings = await veniceEmbed(textChunks)
          for (let i = 0; i < textChunks.length; i++) {
            const embeddingStr = `[${embeddings[i].join(',')}]`
            await prisma.$executeRaw`
              INSERT INTO chunks (article_id, chunk_index, chunk_text, embedding)
              VALUES (${article.id}, ${i}, ${textChunks[i]}, ${embeddingStr}::vector)
            `
          }
        }
        newCount++
      } catch (err) {
        console.error(`[CRON] Error scraping ${url}:`, err)
        errorCount++
      }
    }

    await prisma.scrapeLog.create({
      data: { articlesFound: articleUrls.length, articlesNew: newCount },
    })

    return NextResponse.json({
      triggered: true, total: articleUrls.length, new: newCount, skipped: skipCount, errors: errorCount,
    })
  } catch (error) {
    console.error('[CRON] Scrape error:', error)
    return NextResponse.json({ error: 'Cron scrape failed' }, { status: 500 })
  }
}

export async function POST() { return GET() }
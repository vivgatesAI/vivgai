import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fetchArticleUrls, veniceScrape, veniceEmbed, chunkText, extractTitle, extractSource, contentHash } from '@/lib/venice'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const urls = body.urls as string[] | undefined

  try {
    const articleUrls = urls || await fetchArticleUrls()
    console.log(`Found ${articleUrls.length} articles to scrape`)

    let newCount = 0
    let skipCount = 0
    let errorCount = 0
    const results: Array<{ url: string; status: string; title?: string }> = []

    for (const url of articleUrls) {
      const existing = await prisma.article.findUnique({ where: { url } })
      if (existing) {
        skipCount++
        results.push({ url, status: 'skipped', title: existing.title })
        continue
      }

      try {
        const data = await veniceScrape(url)
        const contentMd = data.content || ''
        if (contentMd.length < 100) {
          results.push({ url, status: 'too_short' })
          continue
        }

        const title = extractTitle(contentMd)
        const source = extractSource(url)
        const hash = contentHash(contentMd)

        const article = await prisma.article.create({
          data: { url, title, source, contentMd, contentLength: contentMd.length, contentHash: hash },
        })

        const textChunks = chunkText(contentMd)
        console.log(`  ${title}: ${textChunks.length} chunks`)

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
        results.push({ url, status: 'scraped', title })
      } catch (err) {
        console.error(`Error scraping ${url}:`, err)
        errorCount++
        results.push({ url, status: 'error' })
      }
    }

    await prisma.scrapeLog.create({
      data: { articlesFound: articleUrls.length, articlesNew: newCount },
    })

    return NextResponse.json({
      total: articleUrls.length, new: newCount, skipped: skipCount, errors: errorCount, results,
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 })
  }
}
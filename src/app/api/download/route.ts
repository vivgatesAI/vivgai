import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/** GET /api/download?type=today|all|date&date=2026-04-25&id=123 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'all'
  const date = searchParams.get('date') // YYYY-MM-DD
  const articleId = searchParams.get('id') // specific article

  try {
    let articles

    if (articleId) {
      articles = await prisma.article.findMany({ where: { id: parseInt(articleId) }, orderBy: { scrapedAt: 'desc' } })
    } else if (type === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      articles = await prisma.article.findMany({ where: { scrapedAt: { gte: today } }, orderBy: { scrapedAt: 'desc' } })
    } else if (type === 'date' && date) {
      const start = new Date(date)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      articles = await prisma.article.findMany({ where: { scrapedAt: { gte: start, lt: end } }, orderBy: { scrapedAt: 'desc' } })
    } else {
      articles = await prisma.article.findMany({ orderBy: { scrapedAt: 'desc' } })
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ error: 'No articles found' }, { status: 404 })
    }

    // Build markdown document
    const lines: string[] = []
    const dateLabel = type === 'today' ? new Date().toISOString().split('T')[0] : (date || 'all')
    
    lines.push(`# GAI Insights Articles — ${dateLabel}`)
    lines.push(``)
    lines.push(`> ${articles.length} articles harvested from gaiinsights.com`)
    lines.push(`> Generated: ${new Date().toISOString()}`)
    lines.push(``)
    lines.push(`---`)
    lines.push(``)

    for (const article of articles) {
      const a = article as any
      lines.push(`## ${a.title}`)
      lines.push(``)
      lines.push(`**Source:** ${a.source} | **URL:** ${a.url} | **Scraped:** ${new Date(a.scrapedAt).toISOString().split('T')[0]}`)
      lines.push(``)
      lines.push(a.contentMd)
      lines.push(``)
      lines.push(`---`)
      lines.push(``)
    }

    const markdown = lines.join('\n')

    // Return as downloadable markdown file
    const headers = new Headers()
    headers.set('Content-Type', 'text/markdown; charset=utf-8')
    headers.set('Content-Disposition', `attachment; filename="gai-articles-${dateLabel}.md"`)

    return new NextResponse(markdown, { headers })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
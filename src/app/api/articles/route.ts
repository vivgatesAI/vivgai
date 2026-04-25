import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const rating = searchParams.get('rating')   // Essential, Important, Optional
  const source = searchParams.get('source')
  const q = searchParams.get('q')            // search title
  const sort = searchParams.get('sort') || 'rated_date'  // rated_date, title, source
  const order = searchParams.get('order') || 'desc'
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')
  const dateFrom = searchParams.get('from')   // YYYY-MM-DD
  const dateTo = searchParams.get('to')        // YYYY-MM-DD

  const where: any = {}

  if (rating) {
    where.rating = rating
  }
  if (source) {
    where.source = source
  }
  if (q) {
    where.title = { contains: q, mode: 'insensitive' }
  }
  if (dateFrom || dateTo) {
    where.ratedDate = {}
    if (dateFrom) where.ratedDate.gte = new Date(dateFrom + 'T00:00:00Z')
    if (dateTo) where.ratedDate.lte = new Date(dateTo + 'T23:59:59Z')
  }

  const validSorts: Record<string, string> = {
    rated_date: 'ratedDate',
    title: 'title',
    source: 'source',
    rating: 'rating',
    scraped_at: 'scrapedAt',
  }
  const sortField = validSorts[sort] || 'ratedDate'
  const sortOrder = order === 'asc' ? 'asc' : 'desc'

  try {
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          url: true,
          source: true,
          contentLength: true,
          scrapedAt: true,
          rating: true,
          ratedDate: true,
          rationale: true,
        },
      }),
      prisma.article.count({ where }),
    ])

    return NextResponse.json({
      articles: articles.map(a => ({
        ...a,
        ratedDate: a.ratedDate?.toISOString().split('T')[0] || null,
        scrapedAt: a.scrapedAt.toISOString().split('T')[0],
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Articles list error:', error)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '10')

  if (!q) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  try {
    const articles = await prisma.article.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { contentMd: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { scrapedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        url: true,
        source: true,
        contentLength: true,
        scrapedAt: true,
      },
    })

    return NextResponse.json({ query: q, results: articles })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
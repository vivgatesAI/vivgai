import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { scrapedAt: 'desc' },
      select: {
        id: true,
        title: true,
        url: true,
        source: true,
        contentLength: true,
        scrapedAt: true,
      },
    })
    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Articles list error:', error)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}
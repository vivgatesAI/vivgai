import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const sources = await prisma.article.groupBy({
      by: ['source'],
      _count: { source: true },
      orderBy: { _count: { source: 'desc' } },
    })
    return NextResponse.json({
      sources: sources.map(s => ({
        source: s.source,
        count: s._count.source,
      })),
    })
  } catch (error) {
    console.error('Sources error:', error)
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }
}
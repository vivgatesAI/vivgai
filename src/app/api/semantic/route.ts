import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { veniceEmbedQuery, veniceChat } from '@/lib/venice'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '5')
  const summarize = searchParams.get('summarize') === 'true'

  if (!q) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  try {
    // Generate query embedding
    const queryEmbedding = await veniceEmbedQuery(q)

    // Convert to string for pgvector query
    const embeddingStr = `[${queryEmbedding.join(',')}]`

    // Semantic search using pgvector cosine distance
    const results = await prisma.$queryRaw<Array<{
      id: number
      chunk_index: number
      chunk_text: string
      article_id: number
      title: string
      url: string
      source: string
      distance: number
    }>>`
      SELECT 
        c.id, c.chunk_index, c.chunk_text,
        a.id as article_id, a.title, a.url, a.source,
        c.embedding <=> ${embeddingStr}::vector as distance
      FROM chunks c
      JOIN articles a ON a.id = c.article_id
      ORDER BY c.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit * 3}
    `

    // Deduplicate by article, keep best chunk per article
    const seen = new Map<number, typeof results[0]>()
    for (const row of results) {
      if (!seen.has(row.article_id) || row.distance < seen.get(row.article_id)!.distance) {
        seen.set(row.article_id, row)
      }
    }

    const topResults = Array.from(seen.values())
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)

    const response: any = {
      query: q,
      results: topResults.map(r => ({
        articleId: r.article_id,
        title: r.title,
        url: r.url,
        source: r.source,
        chunkText: r.chunk_text,
        distance: Number(r.distance.toFixed(4)),
      })),
    }

    // Optional AI summary
    if (summarize && topResults.length > 0) {
      const contextParts = topResults.map(r =>
        `--- ${r.title} (${r.source}) ---\n${r.chunk_text}\n`
      )
      const context = contextParts.join('\n')

      const summary = await veniceChat(
        'You are a research assistant. Answer the user\'s question based on the provided article excerpts. Cite sources by name. Be thorough but concise.',
        `Based on these article excerpts:\n\n${context}\n\nQuestion: ${q}`
      )
      response.summary = summary
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Semantic search error:', error)
    return NextResponse.json({ error: 'Semantic search failed' }, { status: 500 })
  }
}
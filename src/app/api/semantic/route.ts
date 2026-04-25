import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { veniceEmbedQuery, veniceChat } from '@/lib/venice'

/** Retry with exponential backoff */
async function retryChat(systemPrompt: string, userPrompt: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      return await veniceChat(systemPrompt, userPrompt)
    } catch (err: any) {
      const is429 = err?.message?.includes('429') || err?.message?.includes('overloaded')
      if (is429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 2000 // 2s, 4s, 8s
        console.log(`Chat 429, retrying in ${delay}ms (attempt ${i + 1}/${retries})`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
  throw new Error('Chat failed after retries')
}

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

    // Optional AI summary (with retry for 429s)
    if (summarize && topResults.length > 0) {
      try {
        const contextParts = topResults.map(r =>
          `--- ${r.title} (${r.source}) ---\n${r.chunk_text}\n`
        )
        const context = contextParts.join('\n')

        const summary = await retryChat(
          'You are a research assistant. Answer the user\'s question based on the provided article excerpts. Cite sources by name. Be thorough but concise.',
          `Based on these article excerpts:\n\n${context}\n\nQuestion: ${q}`
        )
        response.summary = summary
      } catch (err) {
        console.error('Summary failed (returning results without summary):', err)
        response.summaryError = 'AI summary temporarily unavailable — results still shown below'
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Semantic search error:', error)
    return NextResponse.json({ error: 'Semantic search failed' }, { status: 500 })
  }
}
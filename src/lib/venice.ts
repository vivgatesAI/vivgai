const VENICE_API_KEY = process.env.VENICE_API_KEY || ''
const VENICE_BASE = 'https://api.venice.ai/api/v1'

export interface ScrapeResult {
  url: string
  content: string
  format: string
}

export interface SearchResult {
  title: string
  url: string
  content: string
  date?: string
}

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

/** Scrape a URL and return clean markdown */
export async function veniceScrape(url: string): Promise<ScrapeResult> {
  const resp = await fetch(`${VENICE_BASE}/augment/scrape`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Scrape failed (${resp.status}): ${err}`)
  }
  return resp.json()
}

/** Search the web via Venice */
export async function veniceSearch(query: string, limit: number = 10, provider: string = 'brave'): Promise<{ results: SearchResult[] }> {
  const resp = await fetch(`${VENICE_BASE}/augment/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit, search_provider: provider }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Search failed (${resp.status}): ${err}`)
  }
  return resp.json()
}

/** Generate embeddings using Venice */
export async function veniceEmbed(texts: string[], model: string = 'text-embedding-bge-m3'): Promise<number[][]> {
  const allEmbeddings: number[][] = []
  const batchSize = 16

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const resp = await fetch(`${VENICE_BASE}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VENICE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: batch, encoding_format: 'float' }),
    })
    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`Embed failed (${resp.status}): ${err}`)
    }
    const data = await resp.json()
    const sorted = data.data.sort((a: any, b: any) => a.index - b.index)
    allEmbeddings.push(...sorted.map((item: any) => item.embedding))
  }

  return allEmbeddings
}

/** Generate a single embedding for a query */
export async function veniceEmbedQuery(text: string, model: string = 'text-embedding-bge-m3'): Promise<number[]> {
  const embeddings = await veniceEmbed([text], model)
  return embeddings[0]
}

/** Chat completion for summarization */
export async function veniceChat(systemPrompt: string, userPrompt: string, model: string = 'google-gemma-4-31b-it'): Promise<string> {
  const resp = await fetch(`${VENICE_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      venice_parameters: {
        include_venice_system_prompt: false,
        strip_thinking_response: true,
      },
    }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Chat failed (${resp.status}): ${err}`)
  }
  const data = await resp.json()
  return data.choices?.[0]?.message?.content || ''
}

/** Fetch articles page from gaiinsights.com */
export async function fetchArticleUrls(): Promise<string[]> {
  const data = await veniceScrape('https://gaiinsights.com/articles')
  const content = data.content || ''

  const urlPattern = /https?:\/\/[^\)\s\|\"<>]+/g
  const urls = content.match(urlPattern) || []

  const seen = new Set<string>()
  const articleUrls: string[] = []

  for (let rawUrl of urls) {
    const url = rawUrl.replace(/[.,;:]+$/, '')
    if (url.includes('gaiinsights.com')) continue
    if (url.includes('linkedin.com') || url.includes('youtube.com') || url.includes('hubspot')) continue
    const base = url.split('?')[0].split('&')[0]
    if (seen.has(base)) continue
    seen.add(base)
    articleUrls.push(base)
  }

  return articleUrls
}

/** Chunk text into overlapping segments */
export function chunkText(text: string, maxChars: number = 1000, overlap: number = 200): string[] {
  const paragraphs = text.split('\n\n')
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue
    if (current.length + trimmed.length + 2 > maxChars && current) {
      chunks.push(current.trim())
      current = current.length > overlap ? current.slice(-overlap) + '\n\n' + trimmed : trimmed
    } else {
      current = current ? current + '\n\n' + trimmed : trimmed
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}

/** Extract title from markdown */
export function extractTitle(md: string): string {
  for (const line of md.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
      return trimmed.replace(/^#+\s*/, '').trim()
    }
  }
  for (const line of md.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.length > 5) return trimmed.slice(0, 100)
  }
  return 'Untitled'
}

/** Extract source domain from URL */
export function extractSource(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain
  } catch {
    return url
  }
}

/** Simple hash for dedup */
export function contentHash(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash).toString(16).slice(0, 16)
}
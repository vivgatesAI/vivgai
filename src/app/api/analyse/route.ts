import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { veniceChat } from '@/lib/venice'

const SYSTEM_PROMPT = `You are an AI industry analyst focused on evaluating the significance of AI-related news for an audience of AI leaders (executives, product leaders, and technical decision-makers responsible for AI strategy and implementation).

When analyzing a news item, evaluate it across these dimensions:

1. Affected Audience
- Who is directly impacted?
- Is this relevant broadly or only to niche roles/industries?
- How would different AI leaders interpret its importance?

2. Broader Significance
- Does this signal a larger trend or shift?
- Could it reshape competitive dynamics or adoption patterns?

3. Developmental Stage
- Is this production-ready, early-stage, or experimental?
- How actionable is it today?

4. Competitive Landscape
- How does this position the company vs competitors?
- Does it represent leadership, catch-up, or disruption?

5. Real-world Applications
- What are the practical use cases?
- How can organizations create value from this?

Then assign one rating:
- Essential: Immediate, high-impact, requires attention/action
- Important: Worth tracking and understanding soon
- Optional: Low near-term impact

Output a concise, insightful analysis highlighting key takeaways for AI leaders. Avoid fluff. Focus on strategic implications.`

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
  }

  try {
    const article = await prisma.article.findUnique({ where: { id: parseInt(id) } })
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const a = article as any
    const title = a.title
    const source = a.source
    const url = a.url
    const content = (a.contentMd || '').slice(0, 6000) // Truncate to avoid token limits

    const userPrompt = `Analyze this article:

Title: ${title}
Source: ${source}
URL: ${url}

Content:
${content}

Return your analysis as a JSON object with these exact keys:
- "rating": one of "Essential", "Important", or "Optional"
- "affectedAudience": 1-2 sentences
- "broaderSignificance": 1-2 sentences
- "developmentalStage": 1-2 sentences
- "competitiveLandscape": 1-2 sentences
- "realWorldApplications": 1-2 sentences
- "keyTakeaways": array of 3-5 concise bullet points

Return ONLY valid JSON, no markdown fences.`

    // Retry logic for 429s
    let analysis: string | null = null
    for (let i = 0; i < 3; i++) {
      try {
        analysis = await veniceChat(SYSTEM_PROMPT, userPrompt)
        break
      } catch (err: any) {
        const is429 = err?.message?.includes('429') || err?.message?.includes('overloaded')
        if (is429 && i < 2) {
          await new Promise(r => setTimeout(r, Math.pow(2, i) * 3000))
          continue
        }
        throw err
      }
    }

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis failed after retries' }, { status: 500 })
    }

    // Parse the JSON response (strip markdown fences if present)
    let cleaned = analysis.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // If JSON parse fails, return the raw text as a summary
      parsed = {
        rating: 'Important',
        affectedAudience: cleaned.slice(0, 200),
        broaderSignificance: '',
        developmentalStage: '',
        competitiveLandscape: '',
        realWorldApplications: '',
        keyTakeaways: [],
      }
    }

    return NextResponse.json({ analysis: parsed })
  } catch (error) {
    console.error('Analyse error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
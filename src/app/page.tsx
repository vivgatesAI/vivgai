'use client'

import { useState, useEffect, useRef } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Article {
  id: number
  title: string
  url: string
  source: string
  contentLength: number
  scrapedAt: string
}

interface SemanticResult {
  articleId: number
  title: string
  url: string
  source: string
  chunkText: string
  distance: number
}

interface AnalysisResult {
  rating: string
  affectedAudience: string
  broaderSignificance: string
  developmentalStage: string
  competitiveLandscape: string
  realWorldApplications: string
  keyTakeaways: string[]
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SemanticResult[]>([])
  const [summary, setSummary] = useState('')
  const [summaryError, setSummaryError] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [analysisMap, setAnalysisMap] = useState<Record<number, AnalysisResult>>({})
  const [analysingIds, setAnalysingIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'articles'>('search')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchArticles() }, [])

  async function fetchArticles() {
    try {
      const res = await fetch('/api/articles')
      const data = await res.json()
      setArticles(data.articles || [])
    } catch (e) { console.error(e) }
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true)
    setResults([])
    setSummary('')
    setSummaryError('')
    try {
      const res = await fetch(`/api/semantic?q=${encodeURIComponent(query)}&limit=5&summarize=true`)
      const data = await res.json()
      setResults(data.results || [])
      setSummary(data.summary || '')
      setSummaryError(data.summaryError || '')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleScrape() {
    if (scrapeLoading) return
    setScrapeLoading(true)
    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      const data = await res.json()
      alert(`Harvested: ${data.new} new, ${data.skipped} existing, ${data.errors} errors`)
      await fetchArticles()
    } catch (err) {
      alert('Harvest failed: ' + err)
    } finally {
      setScrapeLoading(false)
    }
  }

  async function handleAnalyse(articleId: number) {
    if (analysingIds.has(articleId)) return
    setAnalysingIds(prev => new Set(prev).add(articleId))
    try {
      const res = await fetch(`/api/analyse?id=${articleId}`)
      const data = await res.json()
      if (data.analysis) {
        setAnalysisMap(prev => ({ ...prev, [articleId]: data.analysis }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAnalysingIds(prev => {
        const next = new Set(prev)
        next.delete(articleId)
        return next
      })
    }
  }

  function handleDownload(type: 'today' | 'all') {
    window.open(`/api/download?type=${type}`, '_blank')
  }

  const ratingStyles: Record<string, string> = {
    Essential: 'rating-essential',
    Important: 'rating-important',
    Optional: 'rating-optional',
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* ───── Header ───── */}
      <header style={{ borderBottom: '1px solid var(--border)' }} className="sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="font-editorial text-2xl tracking-tight" style={{ color: 'var(--fg)' }}>
              VivGAI
            </h1>
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--fg-dim)' }}>
              Intelligence Feed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('today')}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{ background: 'var(--bg-card)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
            >
              ↓ Today&rsquo;s MD
            </button>
            <button
              onClick={() => handleDownload('all')}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{ background: 'var(--bg-card)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
            >
              ↓ All MD
            </button>
            <button
              onClick={handleScrape}
              disabled={scrapeLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{ background: 'var(--accent-dim)', color: 'var(--fg)', border: '1px solid var(--accent-dim)' }}
            >
              {scrapeLoading ? '⟳ Harvesting…' : '↻ Harvest'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {/* ───── Stats ───── */}
        <div className="flex items-center gap-6 mb-2 text-sm" style={{ color: 'var(--fg-dim)' }}>
          <span>{articles.length} articles</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>{new Set(articles.map(a => a.source)).size} sources</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>Updated {articles.length > 0 ? new Date(articles[0].scrapedAt).toLocaleDateString() : '—'}</span>
        </div>

        {/* ───── Search ───── */}
        <form onSubmit={handleSearch} className="mb-10 mt-6">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about AI — semantic search across 50+ articles"
              className="w-full px-5 py-4 pr-28 text-base rounded-xl transition-all"
              style={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                color: 'var(--fg)',
              }}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: loading || !query.trim() ? 'var(--fg-dim)' : 'var(--accent)',
                color: loading || !query.trim() ? 'var(--fg-dim)' : 'oklch(0.12 0.02 260)',
              }}
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>

        {/* ───── Tabs ───── */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
          {(['search', 'articles'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                background: activeTab === tab ? 'var(--bg-hover)' : 'transparent',
                color: activeTab === tab ? 'var(--fg)' : 'var(--fg-dim)',
              }}
            >
              {tab === 'search' ? 'Search Results' : 'All Articles'}
            </button>
          ))}
        </div>

        {/* ───── Search Tab ───── */}
        {activeTab === 'search' && (
          <div className="space-y-8 animate-fade-up">
            {summary && (
              <div className="p-6 rounded-xl" style={{ background: 'oklch(0.16 0.03 170)', border: '1px solid oklch(0.25 0.06 170)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✦</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>AI Summary</span>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--fg)', maxWidth: '72ch' }}>
                  {summary}
                </div>
              </div>
            )}
            {summaryError && !summary && (
              <div className="p-4 rounded-lg text-sm" style={{ background: 'oklch(0.15 0.04 40)', color: 'oklch(0.75 0.12 40)', border: '1px solid oklch(0.3 0.08 40)' }}>
                ⚠ {summaryError}
              </div>
            )}

            {results.length > 0 ? results.map((r, i) => (
              <article key={i} className="rounded-xl p-5 transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <a href={r.url} target="_blank" rel="noopener"
                      className="font-editorial text-lg leading-snug hover:underline"
                      style={{ color: 'var(--fg)' }}
                    >
                      {r.title || 'Untitled'}
                    </a>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="source-badge">{r.source}</span>
                      <span className="text-xs" style={{ color: 'var(--fg-dim)' }}>
                        relevance {Math.round((1 - r.distance) * 100)}%
                      </span>
                      <a href={r.url} target="_blank" rel="noopener"
                        className="text-xs hover:underline" style={{ color: 'var(--accent-dim)' }}>
                        ↗ source
                      </a>
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--fg-muted)', maxWidth: '70ch' }}>
                  {r.chunkText.slice(0, 400)}…
                </p>
              </article>
            )) : loading ? (
              <div className="text-center py-20" style={{ color: 'var(--fg-dim)' }}>
                <div className="skeleton w-48 h-6 mx-auto mb-4" />
                <p>Searching across {articles.length} articles…</p>
              </div>
            ) : !query ? (
              <div className="text-center py-20" style={{ color: 'var(--fg-dim)' }}>
                <p className="font-editorial text-xl mb-2" style={{ color: 'var(--fg-muted)' }}>
                  Ask a question to search semantically
                </p>
                <p className="text-sm">Results include inline references and source links</p>
              </div>
            ) : null}
          </div>
        )}

        {/* ───── Articles Tab ───── */}
        {activeTab === 'articles' && (
          <div className="space-y-2 animate-fade-up">
            {articles.length === 0 ? (
              <div className="text-center py-20" style={{ color: 'var(--fg-dim)' }}>
                <p className="font-editorial text-xl mb-2" style={{ color: 'var(--fg-muted)' }}>No articles yet</p>
                <p className="text-sm">Click &ldquo;Harvest&rdquo; to scrape articles from GAI Insights</p>
              </div>
            ) : articles.map(a => {
              const analysis = analysisMap[a.id]
              const isAnalysing = analysingIds.has(a.id)
              return (
                <div key={a.id} className="article-row rounded-lg p-4" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <a href={a.url} target="_blank" rel="noopener"
                        className="font-editorial text-base leading-snug hover:underline"
                        style={{ color: 'var(--fg)' }}
                      >
                        {a.title}
                      </a>
                      <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--fg-dim)' }}>
                        <span className="source-badge">{a.source}</span>
                        <span>{(a.contentLength / 1000).toFixed(1)}k chars</span>
                        <span>{new Date(a.scrapedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {analysis && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${ratingStyles[analysis.rating] || 'rating-optional'}`}>
                          {analysis.rating}
                        </span>
                      )}
                      <a href={`/api/download?type=all&id=${a.id}`} title="Download MD"
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: 'var(--fg-dim)' }}
                        onMouseOver={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-dim)')}
                      >
                        ↓
                      </a>
                      <button
                        onClick={() => handleAnalyse(a.id)}
                        disabled={isAnalysing}
                        className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
                        style={{
                          background: analysis ? 'oklch(0.2 0.04 170)' : 'var(--bg-hover)',
                          color: analysis ? 'var(--accent)' : 'var(--fg-muted)',
                          border: analysis ? '1px solid oklch(0.3 0.06 170)' : '1px solid var(--border)',
                        }}
                      >
                        {isAnalysing ? 'Analysing…' : analysis ? '✦ Analyzed' : '✦ Analyse'}
                      </button>
                    </div>
                  </div>

                  {/* Analysis panel */}
                  {analysis && (
                    <div className="mt-4 pt-4 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ color: 'var(--fg-muted)' }}>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-dim)' }}>Affected Audience</h4>
                          <p className="leading-relaxed" style={{ maxWidth: '60ch' }}>{analysis.affectedAudience}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-dim)' }}>Broader Significance</h4>
                          <p className="leading-relaxed" style={{ maxWidth: '60ch' }}>{analysis.broaderSignificance}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-dim)' }}>Developmental Stage</h4>
                          <p className="leading-relaxed" style={{ maxWidth: '60ch' }}>{analysis.developmentalStage}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-dim)' }}>Competitive Landscape</h4>
                          <p className="leading-relaxed" style={{ maxWidth: '60ch' }}>{analysis.competitiveLandscape}</p>
                        </div>
                        <div className="md:col-span-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-dim)' }}>Real-world Applications</h4>
                          <p className="leading-relaxed" style={{ maxWidth: '70ch' }}>{analysis.realWorldApplications}</p>
                        </div>
                      </div>
                      {analysis.keyTakeaways && analysis.keyTakeaways.length > 0 && (
                        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>Key Takeaways</h4>
                          <ul className="space-y-1">
                            {analysis.keyTakeaways.map((t, i) => (
                              <li key={i} className="flex gap-2" style={{ color: 'var(--fg)' }}>
                                <span style={{ color: 'var(--accent)' }}>→</span>
                                <span style={{ maxWidth: '70ch' }}>{t}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ───── Footer ───── */}
      <footer className="py-8 mt-16 text-center text-xs" style={{ color: 'var(--fg-dim)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-5">
          VivGAI — Harvested from <a href="https://gaiinsights.com/articles" target="_blank" rel="noopener" className="underline" style={{ color: 'var(--fg-muted)' }}>GAI Insights</a> · Powered by Venice AI · {new Set(articles.map(a => a.source)).size} sources
        </div>
      </footer>
    </div>
  )
}
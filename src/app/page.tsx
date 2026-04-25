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
  rating: string | null
  ratedDate: string | null
  rationale: string | null
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

const RATINGS = ['Essential', 'Important', 'Optional'] as const
const RATING_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Essential: { bg: 'oklch(0.2 0.06 40)', text: 'oklch(0.8 0.15 40)', border: 'oklch(0.35 0.1 40)' },
  Important: { bg: 'oklch(0.2 0.04 170)', text: 'oklch(0.75 0.12 170)', border: 'oklch(0.3 0.06 170)' },
  Optional: { bg: 'oklch(0.17 0.02 260)', text: 'oklch(0.55 0.04 260)', border: 'oklch(0.25 0.02 260)' },
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
  const [totalArticles, setTotalArticles] = useState(0)
  const [analysisMap, setAnalysisMap] = useState<Record<number, AnalysisResult>>({})
  const [analysingIds, setAnalysingIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'library' | 'articles'>('library')
  const inputRef = useRef<HTMLInputElement>(null)

  // Library filters
  const [filterRating, setFilterRating] = useState<string>('')
  const [filterSource, setFilterSource] = useState<string>('')
  const [filterSort, setFilterSort] = useState<string>('rated_date')
  const [filterOrder, setFilterOrder] = useState<string>('desc')
  const [filterSearch, setFilterSearch] = useState<string>('')
  const [filterPage, setFilterPage] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => { fetchArticles() }, [])

  async function fetchArticles() {
    try {
      const res = await fetch('/api/articles')
      const data = await res.json()
      setArticles(data.articles || [])
    } catch (e) { console.error(e) }
  }

  async function fetchLibrary() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterRating) params.set('rating', filterRating)
      if (filterSource) params.set('source', filterSource)
      if (filterSearch) params.set('q', filterSearch)
      if (filterSort) params.set('sort', filterSort)
      if (filterOrder) params.set('order', filterOrder)
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(filterPage * PAGE_SIZE))

      const res = await fetch(`/api/articles?${params}`)
      const data = await res.json()
      setArticles(data.articles || [])
      setTotalArticles(data.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (activeTab === 'library') fetchLibrary() }, [filterRating, filterSource, filterSort, filterOrder, filterSearch, filterPage, activeTab])

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
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleScrape() {
    if (scrapeLoading) return
    setScrapeLoading(true)
    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      const data = await res.json()
      alert(`Harvested: ${data.new} new, ${data.skipped} existing, ${data.errors} errors`)
      if (activeTab === 'library') fetchLibrary()
    } catch (err) { alert('Harvest failed: ' + err) }
    finally { setScrapeLoading(false) }
  }

  async function handleAnalyse(articleId: number) {
    if (analysingIds.has(articleId)) return
    setAnalysingIds(prev => new Set(prev).add(articleId))
    try {
      const res = await fetch(`/api/analyse?id=${articleId}`)
      const data = await res.json()
      if (data.analysis) setAnalysisMap(prev => ({ ...prev, [articleId]: data.analysis }))
    } catch (err) { console.error(err) }
    finally { setAnalysingIds(prev => { const next = new Set(prev); next.delete(articleId); return next }) }
  }

  function handleDownload(type: 'today' | 'all') {
    window.open(`/api/download?type=${type}`, '_blank')
  }

  const sources = Array.from(new Set(articles.map(a => a.source))).sort()
  const totalPages = Math.ceil(totalArticles / PAGE_SIZE)
  const ratingCounts = articles.reduce((acc, a) => { acc[a.rating || 'Unrated'] = (acc[a.rating || 'Unrated'] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)' }} className="sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="font-editorial text-2xl tracking-tight" style={{ color: 'var(--fg)' }}>VivGAI</h1>
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--fg-dim)' }}>Intelligence Feed</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleDownload('today')} className="px-3 py-1.5 text-xs font-medium rounded-md" style={{ background: 'var(--bg-card)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>↓ Today MD</button>
            <button onClick={() => handleDownload('all')} className="px-3 py-1.5 text-xs font-medium rounded-md" style={{ background: 'var(--bg-card)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>↓ All MD</button>
            <button onClick={handleScrape} disabled={scrapeLoading} className="px-3 py-1.5 text-xs font-medium rounded-md" style={{ background: 'var(--accent-dim)', color: 'var(--fg)', border: '1px solid var(--accent-dim)' }}>
              {scrapeLoading ? '⟳ Harvesting…' : '↻ Harvest'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Ask anything about AI — semantic search across all articles"
              className="w-full px-5 py-4 pr-28 text-base rounded-xl" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            <button type="submit" disabled={loading || !query.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2 rounded-lg text-sm font-semibold"
              style={{ background: loading || !query.trim() ? 'var(--fg-dim)' : 'var(--accent)', color: loading || !query.trim() ? 'var(--fg-dim)' : 'oklch(0.12 0.02 260)' }}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
          {(['library', 'search', 'articles'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="px-4 py-2 rounded-md text-sm font-medium transition-all capitalize"
              style={{ background: activeTab === tab ? 'var(--bg-hover)' : 'transparent', color: activeTab === tab ? 'var(--fg)' : 'var(--fg-dim)' }}>
              {tab} {tab === 'library' ? `(${totalArticles})` : ''}
            </button>
          ))}
        </div>

        {/* ─── Library Tab ─── */}
        {activeTab === 'library' && (
          <div className="animate-fade-up">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
              <select value={filterRating} onChange={e => setFilterRating(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                <option value="">All Ratings</option>
                {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                <option value="">All Sources</option>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterSort} onChange={e => setFilterSort(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                <option value="rated_date">By Date</option>
                <option value="title">By Title</option>
                <option value="source">By Source</option>
                <option value="rating">By Rating</option>
              </select>
              <button onClick={() => setFilterOrder(filterOrder === 'desc' ? 'asc' : 'desc')}
                className="px-2 py-1.5 text-sm rounded-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
                {filterOrder === 'desc' ? '↓' : '↑'}
              </button>
              <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Filter by title…"
                className="px-3 py-1.5 text-sm rounded-md flex-1 min-w-[200px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            </div>

            {/* Rating summary */}
            <div className="flex gap-4 mb-6 text-sm" style={{ color: 'var(--fg-dim)' }}>
              {RATINGS.map(r => {
                const style = RATING_STYLES[r]
                return (
                  <button key={r} onClick={() => setFilterRating(filterRating === r ? '' : r)}
                    className="px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase"
                    style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}`, opacity: filterRating && filterRating !== r ? 0.4 : 1 }}>
                    {r}
                  </button>
                )
              })}
            </div>

            {/* Articles list */}
            <div className="space-y-2">
              {articles.map(a => {
                const analysis = analysisMap[a.id]
                const isAnalysing = analysingIds.has(a.id)
                const rs = RATING_STYLES[a.rating as string] || RATING_STYLES.Optional
                return (
                  <div key={a.id} className="article-row rounded-lg p-4" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {a.rating && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase"
                              style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}>
                              {a.rating}
                            </span>
                          )}
                          {a.ratedDate && (
                            <span className="text-xs" style={{ color: 'var(--fg-dim)' }}>{a.ratedDate}</span>
                          )}
                        </div>
                        <a href={a.url} target="_blank" rel="noopener"
                          className="font-editorial text-base leading-snug hover:underline" style={{ color: 'var(--fg)' }}>
                          {a.title}
                        </a>
                        <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--fg-dim)' }}>
                          <span className="source-badge">{a.source}</span>
                          <span>{(a.contentLength / 1000).toFixed(1)}k chars</span>
                        </div>
                        {a.rationale && !analysis && (
                          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--fg-muted)', maxWidth: '70ch' }}>
                            {a.rationale.slice(0, 200)}{a.rationale.length > 200 ? '…' : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a href={`/api/download?type=all&id=${a.id}`} title="Download MD"
                          className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--fg-dim)' }}
                          onMouseOver={e => (e.currentTarget.style.color = 'var(--accent)')}
                          onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-dim)')}>↓</a>
                        <button onClick={() => handleAnalyse(a.id)} disabled={isAnalysing}
                          className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
                          style={{ background: analysis ? 'oklch(0.2 0.04 170)' : 'var(--bg-hover)', color: analysis ? 'var(--accent)' : 'var(--fg-muted)', border: analysis ? '1px solid oklch(0.3 0.06 170)' : '1px solid var(--border)' }}>
                          {isAnalysing ? 'Analysing…' : analysis ? '✦ Analyzed' : '✦ Analyse'}
                        </button>
                      </div>
                    </div>

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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setFilterPage(Math.max(0, filterPage - 1))} disabled={filterPage === 0}
                  className="px-3 py-1.5 text-sm rounded-md" style={{ background: 'var(--bg-card)', color: filterPage === 0 ? 'var(--fg-dim)' : 'var(--fg)', border: '1px solid var(--border)' }}>
                  ← Prev
                </button>
                <span className="text-sm" style={{ color: 'var(--fg-dim)' }}>
                  Page {filterPage + 1} of {totalPages} ({totalArticles} articles)
                </span>
                <button onClick={() => setFilterPage(Math.min(totalPages - 1, filterPage + 1))} disabled={filterPage >= totalPages - 1}
                  className="px-3 py-1.5 text-sm rounded-md" style={{ background: 'var(--bg-card)', color: filterPage >= totalPages - 1 ? 'var(--fg-dim)' : 'var(--fg)', border: '1px solid var(--border)' }}>
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Search Tab ─── */}
        {activeTab === 'search' && (
          <div className="space-y-8 animate-fade-up">
            {summary && (
              <div className="p-6 rounded-xl" style={{ background: 'oklch(0.16 0.03 170)', border: '1px solid oklch(0.25 0.06 170)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✦</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>AI Summary</span>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--fg)', maxWidth: '72ch' }}>{summary}</div>
              </div>
            )}
            {summaryError && !summary && (
              <div className="p-4 rounded-lg text-sm" style={{ background: 'oklch(0.15 0.04 40)', color: 'oklch(0.75 0.12 40)', border: '1px solid oklch(0.3 0.08 40)' }}>
                ⚠ {summaryError}
              </div>
            )}
            {results.length > 0 ? results.map((r, i) => (
              <article key={i} className="rounded-xl p-5 transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0 mb-2">
                  <a href={r.url} target="_blank" rel="noopener" className="font-editorial text-lg leading-snug hover:underline" style={{ color: 'var(--fg)' }}>
                    {r.title || 'Untitled'}
                  </a>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="source-badge">{r.source}</span>
                    <span className="text-xs" style={{ color: 'var(--fg-dim)' }}>relevance {Math.round((1 - r.distance) * 100)}%</span>
                    <a href={r.url} target="_blank" rel="noopener" className="text-xs hover:underline" style={{ color: 'var(--accent-dim)' }}>↗ source</a>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--fg-muted)', maxWidth: '70ch' }}>{r.chunkText.slice(0, 400)}…</p>
              </article>
            )) : loading ? (
              <div className="text-center py-20" style={{ color: 'var(--fg-dim)' }}>
                <div className="skeleton w-48 h-6 mx-auto mb-4" />
                <p>Searching across {totalArticles} articles…</p>
              </div>
            ) : !query ? (
              <div className="text-center py-20" style={{ color: 'var(--fg-dim)' }}>
                <p className="font-editorial text-xl mb-2" style={{ color: 'var(--fg-muted)' }}>Ask a question to search semantically</p>
              </div>
            ) : null}
          </div>
        )}

        {/* ─── Articles Tab (original simple view) ─── */}
        {activeTab === 'articles' && (
          <div className="space-y-2 animate-fade-up">
            {articles.map(a => (
              <div key={a.id} className="article-row rounded-lg p-4" style={{ border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <a href={a.url} target="_blank" rel="noopener" className="font-editorial text-base leading-snug hover:underline" style={{ color: 'var(--fg)' }}>
                      {a.title}
                    </a>
                    <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--fg-dim)' }}>
                      <span className="source-badge">{a.source}</span>
                      <span>{(a.contentLength / 1000).toFixed(1)}k chars</span>
                      <span>{a.scrapedAt}</span>
                    </div>
                  </div>
                  <a href={`/api/download?type=all&id=${a.id}`} className="text-cream/30 hover:text-brand-300 shrink-0 ml-3">↓</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 mt-16 text-center text-xs" style={{ color: 'var(--fg-dim)', borderTop: '1px solid var(--border)' }}>
        VivGAI — Harvested from <a href="https://gaiinsights.com/articles" target="_blank" rel="noopener" className="underline" style={{ color: 'var(--fg-muted)' }}>GAI Insights</a> · Powered by Venice AI · {new Set(articles.map(a => a.source)).size} sources
      </footer>
    </div>
  )
}
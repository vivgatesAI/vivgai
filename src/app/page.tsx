'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Database, Zap, ExternalLink, Clock, Hash, Sparkles, ArrowRight, RefreshCw } from 'lucide-react'

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

interface SourceInfo {
  source: string
  count: number
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SemanticResult[]>([])
  const [summary, setSummary] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [sources, setSources] = useState<SourceInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'articles'>('search')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchArticles()
    fetchSources()
  }, [])

  async function fetchArticles() {
    try {
      const res = await fetch('/api/articles')
      const data = await res.json()
      setArticles(data.articles || [])
    } catch (e) { console.error(e) }
  }

  async function fetchSources() {
    try {
      const res = await fetch('/api/sources')
      const data = await res.json()
      setSources(data.sources || [])
    } catch (e) { console.error(e) }
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setResults([])
    setSummary('')
    try {
      const res = await fetch(`/api/semantic?q=${encodeURIComponent(query)}&limit=5&summarize=true`)
      const data = await res.json()
      setResults(data.results || [])
      setSummary(data.summary || '')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleScrape() {
    setScrapeLoading(true)
    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      const data = await res.json()
      alert(`Scraped: ${data.new} new, ${data.skipped} existing, ${data.errors} errors`)
      await fetchArticles()
    } catch (err) {
      alert('Scrape failed: ' + err)
    } finally {
      setScrapeLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-surface-300/50 backdrop-blur-sm sticky top-0 z-50 bg-surface/90">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-cream">VivGAI</h1>
              <p className="text-[11px] text-cream/40 -mt-0.5">AI Article Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://gaiinsights.com/articles" target="_blank" rel="noopener"
              className="text-xs text-cream/50 hover:text-cream/80 transition-colors flex items-center gap-1">
              <ExternalLink size={12} /> Source
            </a>
            <button
              onClick={handleScrape}
              disabled={scrapeLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-cream/70 hover:text-cream text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={scrapeLoading ? 'animate-spin' : ''} />
              {scrapeLoading ? 'Scraping...' : 'Harvest'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-8 text-sm">
          <div className="flex items-center gap-1.5 text-cream/50">
            <Database size={14} />
            <span>{articles.length} articles</span>
          </div>
          <div className="flex items-center gap-1.5 text-cream/50">
            <Hash size={14} />
            <span>{sources.length} sources</span>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/30" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about AI articles..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-surface-100 border border-surface-300/50 text-cream placeholder:text-cream/30 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all text-base"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {loading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'search' ? 'bg-surface-300 text-cream' : 'text-cream/50 hover:text-cream/70'}`}
          >
            Results
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'articles' ? 'bg-surface-300 text-cream' : 'text-cream/50 hover:text-cream/70'}`}
          >
            All Articles
          </button>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            {/* AI Summary */}
            {summary && (
              <div className="mb-8 p-6 rounded-2xl bg-brand-600/10 border border-brand-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-brand-400" />
                  <span className="text-sm font-semibold text-brand-300">AI Summary</span>
                </div>
                <div className="text-cream/90 leading-relaxed whitespace-pre-line text-sm">{summary}</div>
              </div>
            )}

            {/* Results */}
            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map((r, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-surface-50 border border-surface-300/30 hover:border-surface-300/60 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <a href={r.url} target="_blank" rel="noopener"
                          className="font-display font-semibold text-cream hover:text-brand-300 transition-colors flex items-center gap-1.5">
                          {r.title || 'Untitled'}
                          <ExternalLink size={12} className="opacity-50" />
                        </a>
                        <div className="flex items-center gap-3 mt-1 text-xs text-cream/40">
                          <span>{r.source}</span>
                          <span>relevance: {(1 - r.distance).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-cream/60 leading-relaxed mt-2">{r.chunkText.slice(0, 300)}...</p>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="text-center py-16 text-cream/30">
                <RefreshCw size={32} className="animate-spin mx-auto mb-4" />
                <p>Searching across {articles.length} articles...</p>
              </div>
            ) : query && !loading ? (
              <div className="text-center py-16 text-cream/30">
                <p>No results yet. Try searching for something.</p>
              </div>
            ) : (
              <div className="text-center py-16 text-cream/30">
                <Search size={32} className="mx-auto mb-4 opacity-50" />
                <p>Ask a question about AI to search with semantic similarity</p>
              </div>
            )}
          </div>
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div className="space-y-3">
            {articles.map((a) => (
              <div key={a.id} className="p-4 rounded-xl bg-surface-50 border border-surface-300/30 hover:border-surface-300/60 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <a href={a.url} target="_blank" rel="noopener"
                      className="font-display font-semibold text-cream hover:text-brand-300 transition-colors flex items-center gap-1.5">
                      <span className="truncate">{a.title}</span>
                      <ExternalLink size={12} className="opacity-50 shrink-0" />
                    </a>
                    <div className="flex items-center gap-3 mt-1 text-xs text-cream/40">
                      <span>{a.source}</span>
                      <span>{(a.contentLength / 1000).toFixed(1)}k chars</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{new Date(a.scrapedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-cream/20 shrink-0 ml-3" />
                </div>
              </div>
            ))}
            {articles.length === 0 && (
              <div className="text-center py-16 text-cream/30">
                <Database size={32} className="mx-auto mb-4 opacity-50" />
                <p>No articles yet. Click &ldquo;Harvest&rdquo; to scrape.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
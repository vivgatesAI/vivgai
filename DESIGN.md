# VivGAI Design Document

> Last updated: 2026-04-25

## Design Context

### Users
AI leaders — executives, product leaders, and technical decision-makers responsible for AI strategy — who scan dozens of articles daily and need rapid signal-from-noise analysis. They read on desktop during morning briefings, value clarity over decoration, and make decisions based on concise intelligence.

### Brand Personality
**Informed · Decisive · Clear**

Like a premium intelligence briefing: authoritative without being stiff, sharp without being cold. The brand speaks like a trusted analyst, not a chatbot. Every element earns its place.

### Aesthetic Direction
**Dark editorial** — inspired by premium news analysis sites (The Information, Stratechery, Notion dark mode). 

- Dark background with teal accent (never cyan-on-dark, never purple gradients)
- Instrument Serif for editorial headings — distinctive, authoritative, never generic
- Geist for body text — clean, technical, purposefully modern
- High contrast on dark surfaces, generous whitespace, 72ch max reading width
- Source references inline (not buried at bottom)
- Rating badges use color-coding: amber for Essential, teal for Important, muted for Optional

### Anti-References (what this is NOT)
- NOT a typical "AI dashboard" with glowing cyan cards on dark backgrounds
- NOT a content farm with ad-heavy layouts
- NOT a minimal white tech demo page
- NOT a brutalist terminal aesthetic

## Design System

### Typography Scale
| Role | Size | Weight | Font | Letter-spacing |
|------|------|--------|------|----------------|
| Hero | 2rem | 400 | Instrument Serif | -0.02em |
| Heading | 1.25rem | 600 | Geist | 0 |
| Subheading | 1rem | 500 | Geist | 0 |
| Body | 0.875rem | 400 | Geist | 0 |
| Caption | 0.75rem | 500 | Geist | 0.04em uppercase |
| Source badge | 0.6875rem | 500 | Geist | 0.03em |

Font loading: `Instrument Serif` + `Geist` via Google Fonts CDN. No system font fallback for headings.

### Color Tokens (OKLCH)
```
--bg:            oklch(0.13 0.02 260)    /* Deep ink, not pure black */
--bg-raised:     oklch(0.17 0.02 260)    /* Subtle lift for search/input */
--bg-card:       oklch(0.19 0.015 260)   /* Card surface */
--bg-hover:       oklch(0.23 0.02 260)   /* Hover state */
--fg:            oklch(0.94 0.01 260)    /* Primary text, warm white */
--fg-muted:      oklch(0.62 0.02 260)    /* Secondary text */
--fg-dim:        oklch(0.44 0.015 260)   /* Tertiary / labels */
--accent:        oklch(0.72 0.16 170)   /* Teal — primary action */
--accent-dim:    oklch(0.45 0.10 170)    /* Teal muted — buttons, borders */
--accent-glow:   oklch(0.55 0.12 170 / 0.15)  /* Teal backdrop glow */
--border:        oklch(0.25 0.02 260)    /* Default borders */
--border-focus:  oklch(0.50 0.14 170)   /* Focus rings */
```

Rating colors:
```
--rating-essential:  oklch(0.7 0.18 40)   /* Warm amber */
--rating-important:  oklch(0.72 0.16 170) /* Teal */
--rating-optional:   oklch(0.55 0.08 260) /* Muted slate */
```

### Spacing (4pt base)
```
--space-1: 4px    /* Tight: badge padding, icon gaps */
--space-2: 8px    /* Compact: inline gaps, list items */
--space-3: 12px   /* Default: card padding, form spacing */
--space-4: 16px   /* Comfortable: section padding */
--space-6: 24px   /* Generous: between sections */
--space-8: 32px   /* Large: between major sections */
--space-12: 48px  /* Section breaks */
--space-16: 64px  /* Page-level spacing */
--space-24: 96px  /* Major page breaks */
```

### Border Radius
```
--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px
```

### Motion
- Entrance: `animation: fadeUp 0.35s ease-out` (0 → 8px translateY + opacity)
- Hover: `transition: background 0.15s, border-color 0.15s`
- Shimmer loading: 1.5s infinite gradient sweep
- Exit: faster than entrance (~75% duration)
- Respect `prefers-reduced-motion`

### Component Patterns

**Article Row**: Minimal border card with hover lift. Title in Instrument Serif, metadata in caption-size Geist with source badge. Analysis panel expands below with grid layout.

**Source Badge**: Small pill with low-opacity accent background + accent text + thin border. `font-size: 11px, font-weight: 500, letter-spacing: 0.03em`

**Rating Badge**: Color-coded pill. Essential = amber bg/text/border. Important = teal bg/text/border. Optional = muted slate bg/text/border. `font-size: 10px, font-weight: bold, text-transform: uppercase, letter-spacing: 0.05em`

**Search Input**: Large, prominent, rounded-xl with accent button inline. Focus ring uses accent color.

**Analysis Grid**: 2-column layout for the 5 dimensions + full-width for Real-world Applications and Key Takeaways.

**Key Takeaways**: Arrow-prefixed list items. Accent color for the arrow, primary color for the text.

## Pages

### Home (Search + Articles)
- Sticky header: Logo "VivGAI" in Instrument Serif + "Intelligence Feed" caption + download/harvest buttons
- Stats bar: article count, source count, last updated date
- Search bar: full-width, prominent, with accent search button
- Tabs: Search Results / All Articles
- Search results: AI summary card (teal glow border) + result cards with source badges and inline source links
- Article list: compact rows with title, source badge, metadata, download icon, Analyse button
- Expanded analysis: 5-dimension grid + key takeaways list

### API Endpoints (not user-facing but documented)
- `/api/semantic?q=...&limit=5&summarize=true` — semantic search with AI summary
- `/api/articles` — list all articles
- `/api/sources` — list sources with counts
- `/api/scrape` (POST) — harvest new articles
- `/api/download?type=today|all&id=N` — download markdown files
- `/api/analyse?id=N` — AI industry analysis for an article
- `/api/cron` — scheduled auto-scrape trigger
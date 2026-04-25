import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VivGAI — AI Article Intelligence',
  description: 'Harvested AI insights, searchable with semantic AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-cream antialiased">{children}</body>
    </html>
  )
}
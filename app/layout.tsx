import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GraphPath Pro - Network Routing Visualizer',
  description: 'Interactive Dijkstra and A* pathfinding visualizer for weighted graph networks.',
}

export const viewport: Viewport = {
  themeColor: '#020617',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import '@/styles/globals.css'
import { Providers } from '@/components/layout/Providers'
import { Navbar } from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'OpenClaw Skills — Community Skill Registry',
  description: 'Discover, install, and share community-built OpenClaw AI skills. Every OpenClaw Skill, One Registry.',
  keywords: ['OpenClaw', 'AI skills', 'automation', 'CLI', 'community'],
  openGraph: {
    title: 'OpenClaw Skills',
    description: 'Every OpenClaw Skill, One Registry.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="tech-shell">
        <Providers>
          <Navbar />
          <main className="relative z-10">{children}</main>
          <footer className="relative z-10 mt-20 border-t border-white/10">
            <div className="page-wrap py-8">
              <div className="tech-panel-soft flex flex-col gap-4 px-6 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
                <div>
                  Built for the <span className="text-accent">OpenClaw</span> registry network.
                </div>
                <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-muted-soft">
                  <a href="https://github.com/openclaw/skills" className="hover:text-accent transition-colors">
                    Source
                  </a>
                  <span>MIT</span>
                  <span>Phase 1</span>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}

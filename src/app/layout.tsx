import type { Metadata } from 'next'
import '@/styles/globals.css'
import { Providers } from '@/components/layout/Providers'
import { Navbar } from '@/components/layout/Navbar'

const SITE_URL = 'https://askill.xyz'
const SITE_NAME = 'ASkill'
const SITE_TITLE = 'ASkill — OpenClaw Skills Registry'
const SITE_DESC = 'ASkill - OpenClaw skills, rendered like a live system map. Discover, install, and share community-built OpenClaw AI skills.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  SITE_TITLE,
    template: `%s — ASkill`,
  },
  description: SITE_DESC,
  keywords: ['ASkill', 'OpenClaw', 'AI skills', 'automation', 'CLI', 'community', 'skill registry', 'MCP'],
  authors: [{ name: 'ASkill', url: SITE_URL }],
  creator: 'ASkill',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.png',
    apple:    '/favicon.png',
  },
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:         SITE_URL,
    siteName:    SITE_NAME,
    title:       SITE_TITLE,
    description: SITE_DESC,
  },
  twitter: {
    card:        'summary_large_image',
    title:       SITE_TITLE,
    description: SITE_DESC,
  },
  robots: {
    index:  true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
                  <span>ASkill</span>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}

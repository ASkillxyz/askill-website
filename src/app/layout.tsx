import type { Metadata } from 'next'
import Script from 'next/script'
import '@/styles/globals.css'
import { Providers } from '@/components/layout/Providers'
import { Navbar } from '@/components/layout/Navbar'
import { WechatQrModal } from '@/components/ui/WechatQrModal'

const SITE_URL = 'https://askill.xyz'
const SITE_NAME = 'ASkill'
const SITE_TITLE = 'ASkill — OpenClaw Skills Registry'
const SITE_DESC = 'ASkill - OpenClaw skills, rendered like a live system map. Discover, install, and share community-built OpenClaw AI skills.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  SITE_TITLE,
    template: '%s — ASkill',
  },
  description: SITE_DESC,
  keywords: ['ASkill', 'OpenClaw', 'AI skills', 'automation', 'CLI', 'community', 'skill registry', 'MCP'],
  authors: [{ name: 'ASkill', url: SITE_URL }],
  creator: 'ASkill',
  alternates: { canonical: SITE_URL },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png', sizes: 'any' }],
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
    googleBot: {
      index:               true,
      follow:              true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics 4 — G-HLKNLTSPDQ */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-HLKNLTSPDQ"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-HLKNLTSPDQ');",
          }}
        />
      </head>
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
                <div className="flex items-center gap-5">
                  {/* WeChat — 点击弹出二维码 */}
                  <WechatQrModal />
                  {/* Telegram */}
                  <a
                    href="https://t.me/askillxyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-soft transition-colors hover:text-accent"
                    aria-label="Telegram"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </a>
                  {/* X (Twitter) */}
                  <a
                    href="https://x.com/ASkillxyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-soft transition-colors hover:text-accent"
                    aria-label="X"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-soft">MIT</span>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}

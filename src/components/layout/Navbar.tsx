'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { AuthModal } from '@/components/auth/AuthModal'
import { UserMenu } from '@/components/auth/UserMenu'

const NAV_LINKS = [
  { href: '/',        label: 'Home'   },
  { href: '/skills',  label: 'Browse' },
  { href: '/upload',  label: 'Upload' },
]

const WECHAT_QR  = '/qr-wechat.png'
const TELEGRAM_QR = '/qr-telegram.png'

function CommunityModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: 'rgba(2, 6, 14, 0.78)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="tech-panel tech-outline relative w-full max-w-xl overflow-hidden p-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(125,249,199,0.18),transparent_70%)]" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-muted transition-all hover:bg-white/[0.06] hover:text-white"
        >×</button>

        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7df9c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="section-mono-title mb-2">// Community channels</div>
          <h2 className="mb-2 text-2xl font-semibold tracking-[-0.04em] text-white">加入 Askill 社区</h2>
          <p className="text-sm leading-6 text-muted">扫码进群，与开发者一起讨论技能设计、安装分发和实际工作流。</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="tech-panel-soft tech-outline flex flex-col items-center gap-3 p-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#07C160">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.81-.05-.857-2.578.208-5.345 2.684-7.045C12.11 3.467 10.497 2.188 8.691 2.188zm-2.15 3.618c.448 0 .81.362.81.81a.811.811 0 0 1-.81.81.811.811 0 0 1-.81-.81c0-.448.362-.81.81-.81zm4.297 0c.449 0 .81.362.81.81a.811.811 0 0 1-.81.81.811.811 0 0 1-.81-.81c0-.448.362-.81.81-.81zm5.932 1.618c-4.26 0-7.714 2.878-7.714 6.43 0 3.554 3.453 6.432 7.714 6.432.871 0 1.71-.124 2.496-.345a.75.75 0 0 1 .627.086l1.672.979a.286.286 0 0 0 .147.048c.14 0 .255-.115.255-.26 0-.063-.026-.123-.042-.186l-.342-1.302a.516.516 0 0 1 .187-.584C22.974 17.625 24 15.87 24 13.854c0-3.552-3.454-6.43-7.23-6.43zm-2.97 3.09c.393 0 .712.318.712.712a.713.713 0 0 1-.713.712.713.713 0 0 1-.712-.712c0-.394.318-.712.712-.712zm5.9 0c.394 0 .712.318.712.712a.713.713 0 0 1-.712.712.713.713 0 0 1-.712-.712c0-.394.317-.712.712-.712z"/>
            </svg>
            <img src={WECHAT_QR} alt="微信群二维码" style={{ width: "112px", height: "112px", borderRadius: "12px" }} />
            <span className="text-sm font-medium text-white">微信群</span>
            <span className="text-[11px] uppercase tracking-[0.22em] text-muted-soft">Scan to join</span>
          </div>
          <div className="tech-panel-soft tech-outline flex flex-col items-center gap-3 p-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#229ED9">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <img src={TELEGRAM_QR} alt="Telegram群二维码" style={{ width: "112px", height: "112px", borderRadius: "12px" }} />
            <span className="text-sm font-medium text-white">Telegram 群</span>
            <span className="text-[11px] uppercase tracking-[0.22em] text-muted-soft">Scan to join</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-soft">
          也可以在{' '}
          <a href="https://github.com/openclaw/skills/discussions" target="_blank" rel="noopener noreferrer" className="text-accent transition-colors hover:text-accent-strong">
            GitHub Discussions
          </a>
          {' '}参与讨论
        </p>
      </div>
    </div>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [showAuth, setShowAuth]         = useState(false)
  const [showCommunity, setShowCommunity] = useState(false)

  const isLoggedIn = status === 'authenticated' && !!session?.user

  return (
    <>
      <nav className="sticky top-0 z-50 px-4 py-4 sm:px-6 lg:px-8">
        <div className="page-wrap px-0">
          <div className="tech-panel-soft tech-outline flex h-auto items-center justify-between gap-3 overflow-hidden rounded-[22px] px-4 py-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Askill"
                  style={{ height: '28px', width: 'auto', filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <div className="hidden min-w-0 sm:block">
                <div className="text-sm font-semibold tracking-[0.16em] text-white">ASKILL</div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-soft">OpenClaw Registry</div>
              </div>
            </Link>

            <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 md:flex">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm transition-all duration-150',
                    pathname === href
                      ? 'bg-[linear-gradient(135deg,rgba(125,249,199,0.18),rgba(70,196,255,0.18))] text-white'
                      : 'text-muted hover:bg-white/[0.04] hover:text-white'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 lg:flex">
                <div className="tech-pill px-3 py-2 text-[10px]">registry online</div>
              </div>

              <button
                onClick={() => setShowCommunity(true)}
                className="btn-secondary px-3.5 py-2 text-sm"
              >
                加入社区
              </button>

              {status === 'loading' ? (
                <div className="h-10 w-24 animate-pulse rounded-xl bg-white/[0.04]" />
              ) : isLoggedIn ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="btn-primary px-4 py-2.5 text-sm"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="page-wrap pb-2 md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'tech-pill shrink-0 px-4 py-2 text-xs',
                pathname === href && 'tech-pill-active'
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {showAuth      && <AuthModal      onClose={() => setShowAuth(false)} />}
      {showCommunity && <CommunityModal onClose={() => setShowCommunity(false)} />}
    </>
  )
}

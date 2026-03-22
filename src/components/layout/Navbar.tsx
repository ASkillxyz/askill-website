'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { AuthModal } from '@/components/auth/AuthModal'
import { UserMenu } from '@/components/auth/UserMenu'

const NAV_LINKS = [
  { href: '/',        label: 'Home'   },
  { href: '/skills',  label: 'Browse' },
  { href: '/upload',  label: 'Upload' },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [showAuth, setShowAuth] = useState(false)

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

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}

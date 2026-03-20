'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

// Provider badge colours
const PROVIDER_STYLE: Record<string, { label: string; cls: string }> = {
  github:  { label: 'GitHub',    cls: 'bg-white/10 text-gray-300' },
  google:  { label: 'Google',    cls: 'bg-blue-500/10 text-blue-300' },
  web3:    { label: 'Wallet',    cls: 'bg-amber-500/10 text-amber-300' },
}

export function UserMenu() {
  const { data: session } = useSession()
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!session?.user) return null

  const user       = session.user as any
  const displayName = user.username ?? user.name ?? 'User'
  const provider    = user.provider ?? 'github'
  const badge       = PROVIDER_STYLE[provider] ?? { label: provider, cls: 'bg-white/10 text-gray-300' }

  // Avatar: image URL or initials fallback
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      {/* Trigger: avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 transition-all hover:border-cyan-300/20 hover:bg-white/[0.06]"
      >
        {/* Avatar */}
        {user.image ? (
          <Image
            src={user.image}
            alt={displayName}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 font-['IBM_Plex_Mono'] text-xs font-bold text-accent">
            {provider === 'web3' ? '⬡' : initials}
          </div>
        )}
        <span className="max-w-[96px] truncate text-sm text-white">{displayName}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="tech-panel absolute right-0 top-full z-[100] mt-2 w-56 overflow-hidden rounded-2xl">
          {/* User info header */}
          <div className="border-b border-white/10 px-4 py-3.5">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="truncate text-sm font-medium text-white">{displayName}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            {user.email && (
              <span className="block truncate text-xs text-muted">{user.email}</span>
            )}
            {provider === 'web3' && user.address && (
              <span className="block truncate font-['IBM_Plex_Mono'] text-xs text-muted">{user.address}</span>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted transition-all hover:bg-white/[0.04] hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              My Profile
            </Link>
            <Link
              href="/account/skills"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted transition-all hover:bg-white/[0.04] hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              My Skills
            </Link>
            <Link
              href="/upload"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted transition-all hover:bg-white/[0.04] hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Upload Skill
            </Link>
          </div>

          {/* Sign out */}
          <div className="border-t border-white/10 py-1.5">
            <button
              onClick={() => { signOut({ callbackUrl: '/' }); setOpen(false) }}
              className="flex items-center gap-2.5 px-4 py-2 w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.06] transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

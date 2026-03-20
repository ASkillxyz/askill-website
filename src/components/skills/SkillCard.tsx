'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Skill } from '@/types'
import { formatNumber, getTagColorClass, generateInstallCmd, copyToClipboard } from '@/lib/utils'
import { CATEGORY_TAG_COLORS } from '@/lib/data'

const CARD_BG_MAP: Record<string, string> = {
  'gmail-summarizer':   '#1e3a2f',
  'calendar-optimizer': '#1e2a3a',
  'github-pr-reviewer': '#2a1e3a',
  'image-gen-prompt':   '#3a2a1e',
  'data-csv-analyst':   '#1e3a1e',
  'slack-digest':       '#2a1e2a',
  'sql-schema-gen':     '#1e2a3a',
  'security-auditor':   '#1e3a2f',
  'tweet-crafter':      '#3a1e1e',
}

const CARD_ICON_MAP: Record<string, string> = {
  'gmail-summarizer':   '📧',
  'calendar-optimizer': '📅',
  'github-pr-reviewer': '🔍',
  'image-gen-prompt':   '🎨',
  'data-csv-analyst':   '📊',
  'slack-digest':       '💬',
  'sql-schema-gen':     '🗄️',
  'security-auditor':   '🛡️',
  'tweet-crafter':      '✍️',
}

interface SkillCardProps {
  skill: Skill
}

export function SkillCard({ skill }: SkillCardProps) {
  const [copied, setCopied] = useState(false)

  const bg = CARD_BG_MAP[skill.slug] ?? '#1e2a3a'
  const icon = CARD_ICON_MAP[skill.slug] ?? '⚡'

  async function handleInstall(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const cmd = generateInstallCmd(skill.author.username, skill.slug)
    await copyToClipboard(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Link href={`/skills/${skill.slug}`} className="block skill-card group">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          style={{ background: `linear-gradient(135deg, ${bg}, rgba(8, 17, 31, 0.9))` }}
        >
          {icon}
        </div>
        <div className="text-right font-['IBM_Plex_Mono'] text-[11px] uppercase leading-relaxed tracking-[0.14em] text-muted-soft">
          <div>{skill.author.username}</div>
          <div>{skill.createdAt.slice(0, 7)}</div>
        </div>
      </div>

      <div className="mb-2 text-lg font-semibold tracking-[-0.04em] text-white transition-colors group-hover:text-accent">
        {skill.name}
      </div>

      <p className="mb-5 line-clamp-3 text-sm leading-6 text-muted">
        {skill.description}
      </p>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {skill.categories.slice(0, 2).map((cat) => (
            <span
              key={cat}
              className={`rounded-full px-3 py-1 text-[11px] font-['IBM_Plex_Mono'] ${getTagColorClass(cat)}`}
            >
              {cat}
            </span>
          ))}
        </div>
        <button
          onClick={handleInstall}
          className="install-btn"
        >
          {copied ? '✓ copied' : 'install'}
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <span className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-muted-soft">
          {formatNumber(skill.installCount)} installs
        </span>
        <span className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-accent-strong">
          ★ {skill.stars}
        </span>
      </div>
    </Link>
  )
}

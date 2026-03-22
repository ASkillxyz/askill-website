import Link from 'next/link'
import type { Metadata } from 'next'
import { getFeaturedSkills, getSiteStats } from '@/lib/skills'
import { SkillsGrid } from '@/components/skills/SkillsGrid'
import { StatCard } from '@/components/ui/StatCard'
import { CopyButton } from '@/components/ui/CopyButton'

export const metadata: Metadata = {
  alternates: { canonical: 'https://askill.xyz' },
}

const SIGNALS = [
  { label: 'Registry uptime', value: '99.98%' },
  { label: 'Weekly syncs', value: '24 / day' },
  { label: 'Skill review SLA', value: '< 24h' },
]

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace('.0', '')}k`
  return String(n)
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ASkill',
  url: 'https://askill.xyz',
  description: 'ASkill - OpenClaw skills registry. Discover, install, and share community-built OpenClaw AI skills.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://askill.xyz/skills?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

export default async function HomePage() {
  const [featured, stats] = await Promise.all([
    getFeaturedSkills(6),
    getSiteStats(),
  ])

  return (
    <div className="page-wrap pb-8 pt-8 sm:pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="tech-panel tech-grid tech-outline relative overflow-hidden px-6 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_center,rgba(70,196,255,0.18),transparent_68%)] lg:block" />
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end">
          <div className="max-w-3xl">
            <div className="tech-badge mb-6 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#7df9c7] dot-blink" />
              Open registry stream online
            </div>

            <p className="data-kicker mb-4">Find. Fork. Ship.</p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              ASkill — OpenClaw skills,
              <br />
              rendered like a
              <span className="bg-[linear-gradient(135deg,#7df9c7_0%,#8cc6ff_55%,#f4c77d_100%)] bg-clip-text text-transparent"> live system map</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              The community registry for OpenClaw AI skills. Browse, install, and publish automations with install paths, trend velocity, and author context — built for CLI-first developers.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/skills" className="btn-primary">
                Explore Registry
              </Link>
              <Link href="/upload" className="btn-secondary">
                Publish New Skill
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {SIGNALS.map(({ label, value }) => (
                <div key={label} className="tech-pill px-4 py-2 text-left">
                  <span className="mr-3 text-[10px] uppercase tracking-[0.22em] text-muted-soft">{label}</span>
                  <span className="text-sm text-accent-strong">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tech-panel-soft tech-outline relative overflow-hidden p-5 sm:p-6">
            <div className="section-mono-title mb-4">// Install endpoint</div>
            <div className="rounded-[20px] border border-cyan-400/20 bg-[#06111d] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted-soft">
                <span className="h-2 w-2 rounded-full bg-[#7df9c7]" />
                Secure shell
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <code className="overflow-x-auto font-['IBM_Plex_Mono'] text-xs text-accent sm:text-sm">
                  $ curl -fsSL openclaw.sh/install | sh
                </code>
                <CopyButton text="curl -fsSL openclaw.sh/install | sh" className="shrink-0" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="section-mono-title mb-2">Index mode</div>
                <div className="text-sm text-muted">Curated, searchable, and ready for one-command install.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="section-mono-title mb-2">Signal source</div>
                <div className="text-sm text-muted">Popularity, recency, and author metadata surfaced together.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="section-mono-title mb-2">Target</div>
                <div className="text-sm text-muted">CLI-first builders who want fewer clicks and more context.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          value={formatNumber(stats.totalSkills)}
          label="Published Skills"
          sub={`${stats.totalSkills.toLocaleString()} skills in registry`}
        />
        <StatCard
          value={formatNumber(stats.contributors)}
          label="Contributors"
          sub={`${stats.contributors.toLocaleString()} unique authors`}
          accent
        />
        <StatCard
          value={formatNumber(stats.totalInstalls)}
          label="Total Installs"
          sub={`${stats.totalInstalls.toLocaleString()} installs recorded`}
        />
        <StatCard
          value={String(stats.categories)}
          label="Categories"
          sub={`${stats.categories} skill categories`}
          accent
        />
      </section>

      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="section-mono-title mb-2">// Trending registry</div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">High-signal skills shipping now</h2>
          </div>
          <Link href="/skills" className="text-sm text-accent-strong transition-colors hover:text-accent">
            View all skills
          </Link>
        </div>
        <SkillsGrid skills={featured} />
      </section>
    </div>
  )
}

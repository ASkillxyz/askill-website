import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getSkillBySlug, getFeaturedSkills } from '@/lib/skills'
import { formatNumber, getTagColorClass, generateInstallCmd } from '@/lib/utils'
import { CopyButton } from '@/components/ui/CopyButton'
import { SkillsGrid } from '@/components/skills/SkillsGrid'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const skill = await getSkillBySlug(params.slug)
  if (!skill) return { title: 'Skill Not Found' }
  return {
    title:       `${skill.name} — ASkill`,
    description: skill.description || `Install ${skill.name} — an OpenClaw skill by ${skill.author.username}.`,
    openGraph: {
      title:       `${skill.name} — ASkill`,
      description: skill.description,
      type:        'article',
    },
    twitter: {
      card:        'summary',
      title:       `${skill.name} — ASkill`,
      description: skill.description,
    },
  }
}

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

export default async function SkillDetailPage({ params }: Props) {
  const skill = await getSkillBySlug(params.slug)
  if (!skill) notFound()

  const related = (await getFeaturedSkills(4)).filter((s) => s.slug !== skill.slug).slice(0, 3)
  const installCmd = generateInstallCmd(skill.author.username, skill.slug)
  const bg   = CARD_BG_MAP[skill.slug] ?? '#1e2a3a'
  const icon = CARD_ICON_MAP[skill.slug] ?? '⚡'

  return (
    <div className="page-wrap py-8 sm:py-10">
      <Link
        href="/skills"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-white"
      >
        ← Back to registry
      </Link>

      <section className="tech-panel tech-outline relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(70,196,255,0.18),transparent_70%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="mb-6 flex items-start gap-4">
              <div
                className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[22px] border border-white/10 text-3xl"
                style={{ background: `linear-gradient(135deg, ${bg}, rgba(8, 17, 31, 0.92))` }}
              >
                {icon}
              </div>
              <div>
                <div className="section-mono-title mb-2">// Skill profile</div>
                <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{skill.name}</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{skill.description}</p>
                <p className="mt-3 font-['IBM_Plex_Mono'] text-xs uppercase tracking-[0.16em] text-muted-soft">
                  by <span className="text-accent">{skill.author.username}</span> · published {skill.createdAt}
                </p>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {skill.categories.map((cat) => (
                <span key={cat} className={`rounded-full px-3 py-1 text-[11px] font-['IBM_Plex_Mono'] ${getTagColorClass(cat)}`}>
                  {cat}
                </span>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { val: formatNumber(skill.installCount), label: 'Total installs' },
                { val: `★ ${skill.stars}`,               label: 'Stars'          },
                { val: skill.updatedAt.slice(0, 7),      label: 'Last updated'   },
              ].map(({ val, label }) => (
                <div key={label} className="stat-card">
                  <div className="section-mono-title mb-3">{label}</div>
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-accent">{val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="tech-panel-soft tech-outline p-5">
              <div className="section-mono-title mb-3">// Install command</div>
              <div className="rounded-[20px] border border-cyan-400/20 bg-[#06111d] p-4">
                <code className="block overflow-x-auto font-['IBM_Plex_Mono'] text-sm text-accent">$ {installCmd}</code>
              </div>
              <CopyButton text={installCmd} label="Copy Command" className="mt-4 w-full justify-center" />
            </div>

            <a
              href={skill.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex w-full items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="tech-panel-soft tech-outline p-6 sm:p-7">
          <div className="section-mono-title mb-4">// Full documentation</div>
          <div className="prose-ocs">
            <SkillMarkdown content={skill.fullMarkdown} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="tech-panel-soft tech-outline p-5">
            <div className="section-mono-title mb-4">// Comments</div>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-muted">
              Sign in with GitHub to leave a comment.
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <div className="mb-5">
            <div className="section-mono-title mb-2">// Related skills</div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">More tools from the same signal band</h2>
          </div>
          <SkillsGrid skills={related} />
        </section>
      )}
    </div>
  )
}

function SkillMarkdown({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inCode = false
  let codeLines: string[] = []
  let key = 0

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        elements.push(<pre key={key++}><code>{codeLines.join('\n')}</code></pre>)
        codeLines = []
        inCode = false
      } else {
        inCode = true
      }
      continue
    }
    if (inCode) { codeLines.push(line); continue }

    if      (line.startsWith('## '))  elements.push(<h2 key={key++} className="mb-3 mt-7 text-xl">{line.slice(3)}</h2>)
    else if (line.startsWith('### ')) elements.push(<h3 key={key++} className="mb-2 mt-6 text-lg">{line.slice(4)}</h3>)
    else if (line.startsWith('- '))   elements.push(<li key={key++} className="ml-5 list-disc text-sm leading-7">{line.slice(2)}</li>)
    else if (line.trim())             elements.push(<p  key={key++} className="mb-3 text-sm leading-7">{line}</p>)
  }

  return <div className="prose-ocs">{elements}</div>
}

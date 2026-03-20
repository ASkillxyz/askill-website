'use client'

import { useState } from 'react'
import { ALL_CATEGORIES } from '@/lib/data'
import { slugify } from '@/lib/utils'
import type { Category } from '@/types'

export default function UploadPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [desc, setDesc] = useState('')
  const [repo, setRepo] = useState('')
  const [full, setFull] = useState('')
  const [selectedCats, setSelectedCats] = useState<Category[]>([])
  const [submitted, setSubmitted] = useState(false)

  function handleNameChange(val: string) {
    setName(val)
    setSlug(slugify(val))
  }

  function toggleCat(cat: Category) {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function handleSubmit() {
    if (!name || !desc || !repo) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="page-wrap py-16">
        <div className="tech-panel tech-outline mx-auto max-w-2xl px-6 py-12 text-center sm:px-10">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-3xl text-accent">
            ✓
          </div>
          <div className="section-mono-title mb-2">// Submission received</div>
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">Skill submitted</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted">
            Your skill is now in the review queue and should appear in the registry within 24 hours.
          </p>
          <a href="/skills" className="btn-primary mt-8">
            Browse registry
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap py-8 sm:py-10">
      <section className="tech-panel tech-grid tech-outline relative overflow-hidden px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="section-mono-title mb-3">// Publish workflow</div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">Upload a skill with stronger metadata.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Package the name, repo, categories, and documentation so the registry can present it cleanly and install it fast.
            </p>
          </div>

          <div className="tech-panel-soft tech-outline p-5">
            <div className="section-mono-title mb-4">// Publishing notes</div>
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>Every submission is reviewed before it goes live.</p>
              <p>Short descriptions should explain the outcome, not the implementation.</p>
              <p>Good `SKILL.md` files include setup, examples, and failure cases.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="tech-panel-soft tech-outline p-6 sm:p-8">
          <div className="grid gap-5">
            <div>
              <label className="section-mono-title mb-2 block">Skill name</label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Gmail Summarizer"
                className="tech-input"
              />
              {slug && (
                <p className="mt-2 font-['IBM_Plex_Mono'] text-xs uppercase tracking-[0.16em] text-muted-soft">
                  slug: <span className="text-accent">{slug}</span>
                </p>
              )}
            </div>

            <div>
              <label className="section-mono-title mb-2 block">Short description</label>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="One sentence about what this skill does"
                maxLength={200}
                className="tech-input"
              />
              <p className="mt-2 text-xs text-muted-soft">{desc.length}/200</p>
            </div>

            <div>
              <label className="section-mono-title mb-2 block">GitHub repo URL</label>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="https://github.com/username/skill-name"
                className="tech-input"
              />
              <p className="mt-2 text-xs text-muted-soft">
                Install command:{' '}
                {slug && repo ? (
                  <span className="font-['IBM_Plex_Mono'] text-accent">
                    claw add gh:{repo.replace('https://github.com/', '')}
                  </span>
                ) : (
                  'auto-generated after repo is set'
                )}
              </p>
            </div>

            <div>
              <label className="section-mono-title mb-3 block">Categories</label>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCat(cat)}
                    className={[
                      'tech-pill px-4 py-2 text-xs',
                      selectedCats.includes(cat) ? 'tech-pill-active' : '',
                    ].join(' ')}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="section-mono-title mb-2 block">SKILL.md file</label>
              <div
                className="rounded-[24px] border border-dashed border-cyan-400/20 bg-cyan-400/[0.03] px-6 py-10 text-center transition-all hover:border-cyan-300/30 hover:bg-cyan-400/[0.05]"
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="mb-3 text-4xl">⌘</div>
                <p className="text-sm text-muted">
                  <span className="text-accent">Click to upload</span> or drag & drop your markdown file
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-soft">Markdown only · max 500KB</p>
              </div>
            </div>

            <div>
              <label className="section-mono-title mb-2 block">Full description</label>
              <textarea
                value={full}
                onChange={(e) => setFull(e.target.value)}
                rows={10}
                placeholder={'## What this skill does\n\nDescribe the skill in detail, including features, requirements, and usage examples.'}
                className="tech-textarea resize-y font-['IBM_Plex_Mono']"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!name || !desc || !repo}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit for Review
            </button>
            <p className="text-center text-xs text-muted-soft">Skills are reviewed within 24h · Sign in required to publish</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="tech-panel-soft tech-outline p-5">
            <div className="section-mono-title mb-4">// Preview signal</div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 text-lg font-semibold tracking-[-0.04em] text-white">{name || 'Untitled Skill'}</div>
              <p className="text-sm leading-6 text-muted">{desc || 'Short description will appear here once written.'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(selectedCats.length ? selectedCats : ALL_CATEGORIES.slice(0, 2)).map((cat) => (
                  <span key={cat} className="tech-pill px-3 py-1 text-[11px]">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="tech-panel-soft tech-outline p-5">
            <div className="section-mono-title mb-4">// Quality bar</div>
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>Use a descriptive repo URL and match the slug to the actual package identity.</p>
              <p>Keep the short description outcome-focused and avoid generic marketing copy.</p>
              <p>Include setup steps and at least one concrete example in the full markdown.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

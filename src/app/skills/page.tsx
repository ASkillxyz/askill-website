'use client'

import { useState, useMemo } from 'react'
import { MOCK_SKILLS } from '@/lib/data'
import { SkillsGrid } from '@/components/skills/SkillsGrid'
import { CategoryFilter } from '@/components/skills/CategoryFilter'
import type { Category, SortOption } from '@/types'

export default function SkillsPage() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [sort, setSort] = useState<SortOption>('hot')

  const filtered = useMemo(() => {
    let list = [...MOCK_SKILLS]

    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.author.username.toLowerCase().includes(q)
      )
    }

    if (activeCategory !== 'all') {
      list = list.filter((s) => s.categories.includes(activeCategory))
    }

    switch (sort) {
      case 'hot': list.sort((a, b) => b.installCount - a.installCount); break
      case 'new': list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break
      case 'az': list.sort((a, b) => a.name.localeCompare(b.name)); break
    }

    return list
  }, [query, activeCategory, sort])

  return (
    <div className="page-wrap py-8 sm:py-10">
      <section className="tech-panel tech-grid tech-outline relative overflow-hidden px-6 py-8 sm:px-8 lg:px-10">
        <div className="relative flex flex-col gap-6">
          <div className="max-w-3xl">
            <div className="section-mono-title mb-3">// Registry query interface</div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
              Discover skills through a cleaner control surface.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Search by author, use case, or capability, then cut the list by category and ranking signal.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search skills, authors, keywords..."
              className="tech-input"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="tech-select"
            >
              <option value="hot">Most Popular</option>
              <option value="new">Newest</option>
              <option value="az">A → Z</option>
            </select>
          </div>

          <CategoryFilter active={activeCategory} onChange={setActiveCategory} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="font-['IBM_Plex_Mono'] text-xs uppercase tracking-[0.18em] text-muted-soft">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} loaded
            </p>
            <div className="tech-pill px-4 py-2 text-xs">sort: {sort}</div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SkillsGrid
          skills={filtered}
          emptyMessage="No skills match your search. Try different keywords or clear filters."
        />
      </section>
    </div>
  )
}

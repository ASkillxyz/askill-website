'use client'

import { useState, useEffect, useCallback } from 'react'
import { SkillsGrid } from '@/components/skills/SkillsGrid'
import { CategoryFilter } from '@/components/skills/CategoryFilter'
import type { Category, Skill, SortOption } from '@/types'

export default function SkillsPage() {
  const [query, setQuery]               = useState('')
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [sort, setSort]                 = useState<SortOption>('hot')
  const [skills, setSkills]             = useState<Skill[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [hasMore, setHasMore]           = useState(false)
  const LIMIT = 12

  const fetchSkills = useCallback(async (
    q: string,
    category: Category | 'all',
    sortBy: SortOption,
    p: number,
    append: boolean
  ) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q,
        category,
        sort: sortBy,
        page: String(p),
        limit: String(LIMIT),
      })
      const res  = await fetch(`/api/skills?${params}`)
      const data = await res.json()
      setSkills(prev => append ? [...prev, ...data.skills] : data.skills)
      setTotal(data.total)
      setHasMore(data.hasMore)
    } finally {
      setLoading(false)
    }
  }, [])

  // 搜索/筛选变化时重置到第一页
  useEffect(() => {
    setPage(1)
    fetchSkills(query, activeCategory, sort, 1, false)
  }, [query, activeCategory, sort, fetchSkills])

  function handleLoadMore() {
    const next = page + 1
    setPage(next)
    fetchSkills(query, activeCategory, sort, next, true)
  }

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
              {loading && skills.length === 0
                ? '加载中…'
                : `${total} result${total !== 1 ? 's' : ''} loaded`}
            </p>
            <div className="tech-pill px-4 py-2 text-xs">sort: {sort}</div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        {loading && skills.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="tech-panel-soft tech-outline h-56 animate-pulse rounded-[20px]" />
            ))}
          </div>
        ) : (
          <>
            <SkillsGrid
              skills={skills}
              emptyMessage="No skills match your search. Try different keywords or clear filters."
            />
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="btn-secondary flex items-center gap-2 px-6 py-3"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      加载中…
                    </>
                  ) : `加载更多 · 已显示 ${skills.length} / ${total}`}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

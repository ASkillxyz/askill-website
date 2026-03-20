import type { Skill, SkillsQueryParams, PaginatedResponse, Category } from '@/types'
import { MOCK_SKILLS } from './data'

// ─── Skills API ───────────────────────────────────────────────────────────────
// Phase 1: uses mock data. Phase 2: replace with Supabase client calls.

export async function getSkills(
  params: SkillsQueryParams = {}
): Promise<PaginatedResponse<Skill>> {
  const { q, category, sort = 'hot', page = 1, limit = 12 } = params

  let results = [...MOCK_SKILLS]

  // Filter by search query
  if (q && q.trim()) {
    const query = q.toLowerCase()
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.author.username.toLowerCase().includes(query) ||
        s.categories.some((c) => c.toLowerCase().includes(query))
    )
  }

  // Filter by category
  if (category && category !== 'all') {
    results = results.filter((s) =>
      s.categories.includes(category as Category)
    )
  }

  // Sort
  switch (sort) {
    case 'hot':
      results.sort((a, b) => b.installCount - a.installCount)
      break
    case 'new':
      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      break
    case 'az':
      results.sort((a, b) => a.name.localeCompare(b.name))
      break
  }

  const total = results.length
  const start = (page - 1) * limit
  const data = results.slice(start, start + limit)

  return {
    data,
    total,
    page,
    limit,
    hasMore: start + limit < total,
  }
}

export async function getSkillBySlug(slug: string): Promise<Skill | null> {
  return MOCK_SKILLS.find((s) => s.slug === slug) ?? null
}

export async function getFeaturedSkills(limit = 6): Promise<Skill[]> {
  return [...MOCK_SKILLS]
    .sort((a, b) => b.installCount - a.installCount)
    .slice(0, limit)
}

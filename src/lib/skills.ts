/**
 * lib/skills.ts — Supabase 数据访问层
 * 对齐新 schema：无 author_id / ai_* 字段，有 clawhub_id / clawhub_synced_at / source
 */

import type { Skill, SkillsQueryParams, PaginatedResponse, Category } from '@/types'
import { MOCK_SKILLS, SITE_STATS } from './data'

// 新 schema 中 skills 表的精确字段列表（用于 select，避免 select * 拉多余字段）
const SKILL_FIELDS = [
  'id', 'slug', 'name', 'description', 'full_markdown',
  'github_repo', 'source',
  'author_username', 'author_provider',
  'categories', 'install_count', 'stars',
  'status', 'pr_number', 'pr_url',
  'clawhub_id', 'clawhub_synced_at',
  'published_at', 'created_at', 'updated_at',
].join(', ')

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxxxxxxxxxxx')
  )
}

// DB 行 → Skill 类型（完全对齐新 schema，无 author_id）
function rowToSkill(row: any): Skill {
  const username = row.author_username ?? 'unknown'
  return {
    id:           row.id,
    slug:         row.slug,
    name:         row.name,
    description:  row.description  ?? '',
    fullMarkdown: row.full_markdown ?? '',
    authorId:     username,                    // schema 无 author_id，用 username 代替
    author: {
      id:        username,
      username,
      avatarUrl: undefined,                    // schema 无头像字段
    },
    githubRepo:   row.github_repo   ?? '',
    categories:   (row.categories   ?? []) as Category[],
    installCount: row.install_count ?? 0,
    stars:        row.stars         ?? 0,
    createdAt:    row.created_at?.slice(0, 10) ?? '',
    updatedAt:    row.updated_at?.slice(0, 10) ?? '',
    aiScore:      undefined,                   // schema 无 ai_* 字段
  }
}

// ─── getSkills ────────────────────────────────────────────────────────────────
async function getSkillsFromSupabase(params: SkillsQueryParams): Promise<PaginatedResponse<Skill>> {
  const { supabase } = await import('./supabase')
  const { q, category, sort = 'hot', page = 1, limit = 12 } = params

  let query = supabase
    .from('skills')
    .select(SKILL_FIELDS, { count: 'exact' })
    .eq('status', 'published')

  if (q?.trim()) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,author_username.ilike.%${q}%`)
  }
  if (category && category !== 'all') {
    query = query.contains('categories', [category])
  }
  switch (sort) {
    case 'hot': query = query.order('install_count', { ascending: false }); break
    case 'new': query = query.order('created_at',    { ascending: false }); break
    case 'az':  query = query.order('name',          { ascending: true  }); break
  }
  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  const { data, error, count } = await query
  if (error) throw new Error(`Supabase getSkills: ${error.message}`)
  return {
    data:    (data ?? []).map(rowToSkill),
    total:   count ?? 0,
    page,
    limit,
    hasMore: from + limit < (count ?? 0),
  }
}

function getSkillsFromMock(params: SkillsQueryParams): PaginatedResponse<Skill> {
  const { q, category, sort = 'hot', page = 1, limit = 12 } = params
  let results = [...MOCK_SKILLS]
  if (q?.trim()) {
    const lower = q.toLowerCase()
    results = results.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.description.toLowerCase().includes(lower) ||
      s.author.username.toLowerCase().includes(lower)
    )
  }
  if (category && category !== 'all')
    results = results.filter(s => s.categories.includes(category as Category))
  switch (sort) {
    case 'hot': results.sort((a, b) => b.installCount - a.installCount); break
    case 'new': results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break
    case 'az':  results.sort((a, b) => a.name.localeCompare(b.name)); break
  }
  const total = results.length
  const start = (page - 1) * limit
  return { data: results.slice(start, start + limit), total, page, limit, hasMore: start + limit < total }
}

export async function getSkills(params: SkillsQueryParams = {}): Promise<PaginatedResponse<Skill>> {
  if (isSupabaseConfigured()) {
    try { return await getSkillsFromSupabase(params) }
    catch (e) { console.warn('[skills] getSkills 降级 Mock:', e) }
  }
  return getSkillsFromMock(params)
}

// ─── getSkillBySlug ───────────────────────────────────────────────────────────
export async function getSkillBySlug(slug: string): Promise<Skill | null> {
  if (isSupabaseConfigured()) {
    try {
      const { supabase } = await import('./supabase')
      const { data, error } = await supabase
        .from('skills')
        .select(SKILL_FIELDS)
        .eq('slug', slug)
        .eq('status', 'published')
        .single()
      if (error || !data) return null
      return rowToSkill(data)
    } catch (e) { console.warn('[skills] getSkillBySlug 降级 Mock:', e) }
  }
  return MOCK_SKILLS.find(s => s.slug === slug) ?? null
}

// ─── getFeaturedSkills ────────────────────────────────────────────────────────
// 排序：stars 降序 → install_count 降序
export async function getFeaturedSkills(limit = 6): Promise<Skill[]> {
  if (isSupabaseConfigured()) {
    try {
      const { supabase } = await import('./supabase')
      const { data, error } = await supabase
        .from('skills')
        .select(SKILL_FIELDS)
        .eq('status', 'published')
        .order('stars',         { ascending: false })
        .order('install_count', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []).map(rowToSkill)
    } catch (e) { console.warn('[skills] getFeatured 降级 Mock:', e) }
  }
  return [...MOCK_SKILLS]
    .sort((a, b) => b.stars - a.stars || b.installCount - a.installCount)
    .slice(0, limit)
}

// ─── getSiteStats ─────────────────────────────────────────────────────────────
export interface SiteStats {
  totalSkills:   number
  contributors:  number
  totalInstalls: number
  categories:    number
}

export async function getSiteStats(): Promise<SiteStats> {
  if (isSupabaseConfigured()) {
    try {
      const { supabaseAdmin } = await import('./supabase')

      // 单次查询拿所有需要的聚合字段，减少网络往返
      const { data, error, count } = await supabaseAdmin
        .from('skills')
        .select('author_username, install_count, categories', { count: 'exact' })
        .eq('status', 'published')

      if (error) throw error

      const rows         = data ?? []
      const totalSkills  = count ?? rows.length
      const contributors = new Set(rows.map(r => r.author_username).filter(Boolean)).size
      const totalInstalls = rows.reduce((s, r) => s + (r.install_count ?? 0), 0)
      const allCats = new Set<string>()
      rows.forEach(r => (r.categories ?? []).forEach((c: string) => allCats.add(c)))

      return { totalSkills, contributors, totalInstalls, categories: allCats.size }
    } catch (e) {
      console.warn('[skills] getSiteStats 降级 Mock:', e)
    }
  }
  return {
    totalSkills:   SITE_STATS.totalSkills,
    contributors:  SITE_STATS.contributors,
    totalInstalls: SITE_STATS.totalInstalls,
    categories:    SITE_STATS.categories,
  }
}

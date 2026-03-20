/**
 * lib/skills.ts — Phase 2: Supabase 数据访问层
 *
 * 优先从 Supabase 读取；若环境变量未配置则降级到 Mock 数据（本地开发友好）。
 * schema 对应：skills 表（无 author_id / ai_* 字段，用 author_username 做标识）
 */

import type { Skill, SkillsQueryParams, PaginatedResponse, Category } from '@/types'
import { MOCK_SKILLS } from './data'

// ─── 判断是否已配置 Supabase ──────────────────────────────────────────────────
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxxxxxxxxxxx')
  )
}

// ─── 从 Supabase 行数据映射到 Skill 类型 ─────────────────────────────────────
// 完全基于你的 schema：无 author_id、无 ai_* 字段
function rowToSkill(row: any): Skill {
  const username = row.author_username ?? 'unknown'
  return {
    id:           row.id,
    slug:         row.slug,
    name:         row.name,
    description:  row.description ?? '',
    fullMarkdown: row.full_markdown ?? '',
    authorId:     username,           // schema 无 author_id，用 username 代替
    author: {
      id:        username,
      username,
      avatarUrl: undefined,           // schema 无头像字段
    },
    githubRepo:   row.github_repo ?? '',
    categories:   (row.categories ?? []) as Category[],
    installCount: row.install_count ?? 0,
    stars:        row.stars ?? 0,
    createdAt:    row.created_at?.slice(0, 10) ?? '',
    updatedAt:    row.updated_at?.slice(0, 10) ?? '',
    // schema 无 ai_* 字段，aiScore 始终 undefined
    aiScore:      undefined,
  }
}

// ─── Supabase 查询：技能列表 ──────────────────────────────────────────────────
async function getSkillsFromSupabase(
  params: SkillsQueryParams
): Promise<PaginatedResponse<Skill>> {
  const { supabase } = await import('./supabase')
  const { q, category, sort = 'hot', page = 1, limit = 12 } = params

  let query = supabase
    .from('skills')
    .select('*', { count: 'exact' })
    .eq('status', 'published')

  if (q?.trim()) {
    query = query.or(
      `name.ilike.%${q}%,description.ilike.%${q}%,author_username.ilike.%${q}%`
    )
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
  if (error) throw new Error(`Supabase getSkills error: ${error.message}`)

  return {
    data:    (data ?? []).map(rowToSkill),
    total:   count ?? 0,
    page,
    limit,
    hasMore: from + limit < (count ?? 0),
  }
}

// ─── Supabase 查询：单个技能详情 ─────────────────────────────────────────────
async function getSkillBySlugFromSupabase(slug: string): Promise<Skill | null> {
  const { supabase } = await import('./supabase')

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) return null
  return rowToSkill(data)
}

// ─── Supabase 查询：热门技能 ──────────────────────────────────────────────────
async function getFeaturedSkillsFromSupabase(limit: number): Promise<Skill[]> {
  const { supabase } = await import('./supabase')

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('status', 'published')
    .order('install_count', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Supabase getFeatured error: ${error.message}`)
  return (data ?? []).map(rowToSkill)
}

// ─── Mock 降级 ────────────────────────────────────────────────────────────────
function getSkillsFromMock(params: SkillsQueryParams): PaginatedResponse<Skill> {
  const { q, category, sort = 'hot', page = 1, limit = 12 } = params
  let results = [...MOCK_SKILLS]

  if (q?.trim()) {
    const lower = q.toLowerCase()
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower) ||
        s.author.username.toLowerCase().includes(lower)
    )
  }

  if (category && category !== 'all') {
    results = results.filter((s) => s.categories.includes(category as Category))
  }

  switch (sort) {
    case 'hot': results.sort((a, b) => b.installCount - a.installCount); break
    case 'new': results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break
    case 'az':  results.sort((a, b) => a.name.localeCompare(b.name)); break
  }

  const total = results.length
  const start = (page - 1) * limit
  return { data: results.slice(start, start + limit), total, page, limit, hasMore: start + limit < total }
}

// ─── 公开 API ─────────────────────────────────────────────────────────────────

export async function getSkills(
  params: SkillsQueryParams = {}
): Promise<PaginatedResponse<Skill>> {
  if (isSupabaseConfigured()) {
    try { return await getSkillsFromSupabase(params) }
    catch (e) { console.warn('[skills] Supabase 查询失败，降级 Mock:', e) }
  }
  return getSkillsFromMock(params)
}

export async function getSkillBySlug(slug: string): Promise<Skill | null> {
  if (isSupabaseConfigured()) {
    try { return await getSkillBySlugFromSupabase(slug) }
    catch (e) { console.warn('[skills] Supabase slug 查询失败，降级 Mock:', e) }
  }
  return MOCK_SKILLS.find((s) => s.slug === slug) ?? null
}

export async function getFeaturedSkills(limit = 6): Promise<Skill[]> {
  if (isSupabaseConfigured()) {
    try { return await getFeaturedSkillsFromSupabase(limit) }
    catch (e) { console.warn('[skills] Supabase featured 查询失败，降级 Mock:', e) }
  }
  return [...MOCK_SKILLS].sort((a, b) => b.installCount - a.installCount).slice(0, limit)
}

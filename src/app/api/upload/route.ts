/**
 * POST /api/upload
 *
 * 用户上传 skill 的完整流程：
 *  1. 验证用户登录（NextAuth session）
 *  2. 校验表单数据
 *  3. 提交 SKILL.md 到 GitHub，创建 PR
 *  4. 写入 Supabase（状态为 pending，等待 PR 合并后改为 published）
 *  5. 返回结果
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { submitSkillToGitHub } from '@/lib/github'
import { supabaseAdmin } from '@/lib/supabase'
import { slugify } from '@/lib/utils'

// ─── 请求体类型 ────────────────────────────────────────────────────────────────
interface UploadBody {
  name: string           // 技能名称
  description: string    // 简短描述（≤200字）
  fullMarkdown: string   // 完整 SKILL.md 内容
  githubRepo?: string    // 可选：原始 GitHub 仓库链接
  categories: string[]   // 分类标签
}

// ─── 输入校验 ──────────────────────────────────────────────────────────────────
function validate(body: Partial<UploadBody>): string | null {
  if (!body.name?.trim())
    return 'name 不能为空'
  if (body.name.length > 100)
    return 'name 不能超过100个字符'
  if (!body.description?.trim())
    return 'description 不能为空'
  if (body.description.length > 200)
    return 'description 不能超过200个字符'
  if (!body.fullMarkdown?.trim())
    return 'fullMarkdown 不能为空'
  if (body.fullMarkdown.length > 500_000)
    return 'SKILL.md 不能超过500KB'
  if (!Array.isArray(body.categories) || body.categories.length === 0)
    return '至少选择一个分类'
  if (body.githubRepo && !body.githubRepo.startsWith('https://github.com/'))
    return 'githubRepo 必须是合法的 GitHub 仓库链接'
  return null
}

// ─── 检查 slug 是否已存在 ──────────────────────────────────────────────────────
async function isSlugTaken(slug: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('skills')
    .select('id')
    .eq('slug', slug)
    .single()
  return !!data
}

// ─── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 1. 验证登录
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录后再上传技能' },
        { status: 401 }
      )
    }

    const user = session.user as any
    const authorUsername: string =
      user.username ?? user.name ?? user.email?.split('@')[0] ?? 'anonymous'

    // 2. 解析请求体
    let body: Partial<UploadBody>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
    }

    // 3. 校验
    const validationError = validate(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { name, description, fullMarkdown, githubRepo, categories } =
      body as UploadBody

    // 4. 生成 slug，处理冲突
    let slug = slugify(name)
    if (!slug) {
      return NextResponse.json({ error: '技能名称无效' }, { status: 400 })
    }

    // 如果 slug 已存在，加上时间戳后缀
    if (await isSlugTaken(slug)) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // 5. 提交到 GitHub（创建 PR）
    let prNumber: number | null = null
    let prUrl: string | null = null

    try {
      const result = await submitSkillToGitHub({
        slug,
        markdown: fullMarkdown,
        authorUsername,
        description,
      })
      prNumber = result.prNumber
      prUrl    = result.prUrl
    } catch (ghErr: any) {
      console.error('GitHub PR 创建失败:', ghErr.message)
      // GitHub 失败不阻断流程，继续写 DB（状态标记为 github_failed）
    }

    // 6. 写入 Supabase
    const { data: skill, error: dbErr } = await supabaseAdmin
      .from('skills')
      .insert({
        slug,
        name,
        description,
        full_markdown: fullMarkdown,
        github_repo: githubRepo ?? null,
        categories,
        author_username: authorUsername,
        author_provider: user.provider ?? 'unknown',
        install_count: 0,
        stars: 0,
        status: 'pending',           // pending → published（PR 合并后改）
        pr_number: prNumber,
        pr_url: prUrl,
        source: 'user_upload',
      })
      .select()
      .single()

    if (dbErr) {
      console.error('Supabase 写入失败:', dbErr)
      return NextResponse.json(
        { error: '数据库写入失败，请稍后重试' },
        { status: 500 }
      )
    }

    // 7. 返回成功
    return NextResponse.json({
      success: true,
      slug,
      prNumber,
      prUrl,
      message: prUrl
        ? `技能已提交！PR #${prNumber} 审核通过后将自动发布。`
        : '技能已提交，等待审核后发布。',
    })

  } catch (err: any) {
    console.error('Upload API 未知错误:', err)
    return NextResponse.json(
      { error: '服务器内部错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// ─── GET handler（查询当前用户已上传的 skills）────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = session.user as any
  const username = user.username ?? user.name

  const { data, error } = await supabaseAdmin
    .from('skills')
    .select('id, slug, name, description, status, pr_url, install_count, stars, created_at')
    .eq('author_username', username)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }

  return NextResponse.json({ skills: data })
}
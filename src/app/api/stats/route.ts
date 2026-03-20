import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 300 // 5 分钟缓存

export async function GET() {
  try {
    const [skillsRes, installsRes, categoriesRes] = await Promise.all([
      // 总技能数 + 贡献者数（distinct author_username）
      supabaseAdmin
        .from('skills')
        .select('author_username, install_count', { count: 'exact' })
        .eq('status', 'published'),

      // 全部 install_count 求和
      supabaseAdmin
        .from('skills')
        .select('install_count')
        .eq('status', 'published'),

      // 所有 categories（展开后去重）
      supabaseAdmin
        .from('skills')
        .select('categories')
        .eq('status', 'published'),
    ])

    const rows          = skillsRes.data ?? []
    const totalSkills   = skillsRes.count ?? rows.length

    // 贡献者：distinct author_username（过滤空值）
    const contributors  = new Set(
      rows.map(r => r.author_username).filter(Boolean)
    ).size

    // 总安装数
    const totalInstalls = (installsRes.data ?? []).reduce(
      (sum, r) => sum + (r.install_count ?? 0), 0
    )

    // 分类去重
    const allCats = new Set<string>()
    ;(categoriesRes.data ?? []).forEach(r => {
      ;(r.categories ?? []).forEach((c: string) => allCats.add(c))
    })
    const categories = allCats.size

    return NextResponse.json({
      totalSkills,
      contributors,
      totalInstalls,
      categories,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

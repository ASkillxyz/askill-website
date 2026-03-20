import { NextRequest, NextResponse } from 'next/server'
import { getSkills } from '@/lib/skills'
import type { Category, SortOption } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q        = searchParams.get('q')        ?? ''
  const category = searchParams.get('category') ?? 'all'
  const sort     = (searchParams.get('sort')    ?? 'hot') as SortOption
  const page     = parseInt(searchParams.get('page')  ?? '1', 10)
  const limit    = parseInt(searchParams.get('limit') ?? '12', 10)

  try {
    const result = await getSkills({
      q,
      category: category as Category | 'all',
      sort,
      page,
      limit: Math.min(limit, 50),
    })
    return NextResponse.json({
      skills:  result.data,
      total:   result.total,
      page:    result.page,
      hasMore: result.hasMore,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getSiteStats } from '@/lib/skills'

export const revalidate = 300 // 5 分钟缓存

export async function GET() {
  try {
    const stats = await getSiteStats()
    return NextResponse.json(stats)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

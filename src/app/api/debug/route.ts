/**
 * GET /api/debug
 * 数据库连接诊断（仅限开发环境）
 */
import { NextResponse } from 'next/server'

interface CheckResult {
  ok: boolean
  label: string
  detail?: string
  ms?: number
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const results: CheckResult[] = []
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 1. 环境变量
  results.push({ ok: !!(url && !url.includes('xxxxxxxxxxxx')), label: 'NEXT_PUBLIC_SUPABASE_URL',   detail: url  ? url.replace(/^(https:\/\/[^.]{4})[^.]+/, '$1****') : '未设置' })
  results.push({ ok: !!(anon && anon.startsWith('eyJ')),       label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', detail: anon ? `eyJ...${anon.slice(-6)}` : '未设置' })
  results.push({ ok: !!(svc  && svc.startsWith('eyJ')),        label: 'SUPABASE_SERVICE_ROLE_KEY',  detail: svc  ? `eyJ...${svc.slice(-6)}`  : '未设置' })

  if (!results.every(r => r.ok)) {
    return NextResponse.json({ timestamp: new Date().toISOString(), allOk: false, results, rows: [], total: 0 })
  }

  const { createClient } = await import('@supabase/supabase-js')

  // 2. 连通性（anon）
  const t0 = Date.now()
  try {
    const { error } = await createClient(url!, anon!).from('skills').select('id').limit(1)
    results.push({ ok: !error, label: '数据库连通性（anon）', detail: error ? `${error.code}: ${error.message}` : 'SELECT 成功', ms: Date.now() - t0 })
  } catch (e: any) {
    results.push({ ok: false, label: '数据库连通性（anon）', detail: e.message })
  }

  // 3. skills 表读取（新 schema 字段）
  let rows: any[] = [], total = 0
  const t1 = Date.now()
  try {
    const { data, error, count } = await createClient(url!, svc!)
      .from('skills')
      .select('id, slug, name, status, source, install_count, stars, author_username, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      results.push({ ok: false, label: 'skills 表读取', detail: `${error.code}: ${error.message}` })
    } else {
      rows  = data ?? []
      total = count ?? 0
      results.push({ ok: true, label: 'skills 表读取', detail: `共 ${total} 条，最新 5 条已返回`, ms: Date.now() - t1 })
    }
  } catch (e: any) {
    results.push({ ok: false, label: 'skills 表读取', detail: e.message })
  }

  // 4. 新字段验证（clawhub_id / clawhub_synced_at 是否存在）
  try {
    const { data, error } = await createClient(url!, svc!)
      .from('skills')
      .select('clawhub_id, clawhub_synced_at')
      .limit(1)
    results.push({
      ok:     !error,
      label:  '新字段验证（clawhub_id / clawhub_synced_at）',
      detail: error ? `${error.code}: ${error.message}` : '字段存在 ✓',
    })
  } catch (e: any) {
    results.push({ ok: false, label: '新字段验证', detail: e.message })
  }

  // 5. RLS 验证
  try {
    const anonClient = createClient(url!, anon!)
    const { data: pub } = await anonClient.from('skills').select('status').eq('status', 'published').limit(1)
    const { data: pen } = await anonClient.from('skills').select('status').eq('status', 'pending').limit(1)
    results.push({
      ok: true,
      label: 'RLS 策略验证',
      detail: `anon 可见 published: ${pub?.length ?? 0} 条，pending: ${pen?.length ?? 0} 条（应为 0）`,
    })
  } catch (e: any) {
    results.push({ ok: false, label: 'RLS 策略验证', detail: e.message })
  }

  return NextResponse.json({ timestamp: new Date().toISOString(), allOk: results.every(r => r.ok), results, rows, total })
}

/**
 * GET /api/debug
 * 数据库连接诊断接口（仅限开发环境）
 * 生产部署前请删除此文件或加 IP 限制
 */

import { NextResponse } from 'next/server'

interface CheckResult {
  ok: boolean
  label: string
  detail?: string
  ms?: number
}

export async function GET() {
  // 仅允许开发环境访问
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const results: CheckResult[] = []

  // ── 1. 环境变量检查 ────────────────────────────────────────────────────────
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY

  results.push({
    ok:     !!(url && !url.includes('xxxxxxxxxxxx')),
    label:  'NEXT_PUBLIC_SUPABASE_URL',
    detail: url ? url.replace(/^(https:\/\/[^.]{4})[^.]+/, '$1****') : '未设置',
  })
  results.push({
    ok:     !!(anon && anon.startsWith('eyJ')),
    label:  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    detail: anon ? `eyJ...${anon.slice(-6)}` : '未设置',
  })
  results.push({
    ok:     !!(svc && svc.startsWith('eyJ')),
    label:  'SUPABASE_SERVICE_ROLE_KEY',
    detail: svc ? `eyJ...${svc.slice(-6)}` : '未设置',
  })

  const envOk = results.every(r => r.ok)

  // ── 2. 网络连通性（anon client）────────────────────────────────────────────
  if (envOk) {
    const t0 = Date.now()
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const client = createClient(url!, anon!)
      const { error } = await client.from('skills').select('id').limit(1)
      const ms = Date.now() - t0
      results.push({
        ok:     !error,
        label:  '数据库连通性（anon）',
        detail: error ? `${error.code}: ${error.message}` : 'SELECT 成功',
        ms,
      })
    } catch (e: any) {
      results.push({ ok: false, label: '数据库连通性（anon）', detail: e.message })
    }

    // ── 3. skills 表结构检查 ──────────────────────────────────────────────────
    const t1 = Date.now()
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(url!, svc!)
      const { data, error, count } = await admin
        .from('skills')
        .select('id, slug, name, status, install_count, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5)
      const ms = Date.now() - t1

      if (error) {
        results.push({ ok: false, label: 'skills 表读取', detail: `${error.code}: ${error.message}` })
      } else {
        results.push({
          ok:     true,
          label:  'skills 表读取',
          detail: `共 ${count} 条记录，最新 5 条已返回`,
          ms,
        })
        // 附加 rows 数据，前端展示用
        ;(results as any).rows = data
        ;(results as any).total = count
      }
    } catch (e: any) {
      results.push({ ok: false, label: 'skills 表读取（admin）', detail: e.message })
    }

    // ── 4. RLS 验证（anon 只能看 published）─────────────────────────────────
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const client = createClient(url!, anon!)
      const { data: pub } = await client.from('skills').select('status').eq('status', 'published').limit(1)
      const { data: pen } = await client.from('skills').select('status').eq('status', 'pending').limit(1)
      results.push({
        ok:     true,
        label:  'RLS 策略验证',
        detail: `anon 可见 published: ${pub?.length ?? 0} 条，pending: ${pen?.length ?? 0} 条（应为 0）`,
      })
    } catch (e: any) {
      results.push({ ok: false, label: 'RLS 策略验证', detail: e.message })
    }
  }

  // ── 5. 提取 rows（service role 查到的最新记录）────────────────────────────
  const rowsResult = results.find(r => r.label === 'skills 表读取') as any
  const rows   = rowsResult ? (results as any).rows ?? [] : []
  const total  = rowsResult ? (results as any).total ?? 0 : 0

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    allOk: results.every(r => r.ok),
    results,
    rows,
    total,
  })
}

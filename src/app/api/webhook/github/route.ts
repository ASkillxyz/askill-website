/**
 * POST /api/webhook/github
 *
 * 监听 GitHub Webhook 事件：
 * 当 PR 被合并（closed + merged）时，把对应 skill 状态改为 published
 *
 * 在 GitHub repo 设置 Webhook：
 *   URL:          https://askill.xyz/api/webhook/github
 *   Content type: application/json
 *   Secret:       与 GITHUB_WEBHOOK_SECRET 环境变量一致
 *   Events:       Pull requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

// ─── 验证 GitHub Webhook 签名 ─────────────────────────────────────────────────
function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) return false
  const expected = 'sha256=' + createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  // 恒定时间比较，防止时序攻击
  return expected.length === signature.length &&
    expected.split('').every((c, i) => c === signature[i])
}

export async function POST(req: NextRequest) {
  try {
    const payload   = await req.text()
    const signature = req.headers.get('x-hub-signature-256') ?? ''
    const event     = req.headers.get('x-github-event') ?? ''

    // 1. 验证签名
    if (!verifySignature(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. 只处理 pull_request 事件
    if (event !== 'pull_request') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const data = JSON.parse(payload)

    // 3. 只处理 PR 被合并的情况
    if (data.action !== 'closed' || !data.pull_request?.merged) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const prNumber: number = data.pull_request.number
    const prTitle: string  = data.pull_request.title ?? ''

    console.log(`PR #${prNumber} merged: ${prTitle}`)

    // 4. 把对应 skill 状态改为 published
    const { data: updated, error } = await supabaseAdmin
      .from('skills')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('pr_number', prNumber)
      .select('slug, name')

    if (error) {
      console.error('Webhook DB update error:', error)
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
    }

    console.log(`Published skills:`, updated)
    return NextResponse.json({ ok: true, published: updated })

  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
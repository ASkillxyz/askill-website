/**
 * GET /api/debug/github
 * 诊断 GitHub PR 创建能力（仅限开发环境）
 */
import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const TOKEN = process.env.GITHUB_TOKEN
  const OWNER = process.env.GITHUB_SKILLS_OWNER
  const REPO  = process.env.GITHUB_SKILLS_REPO
  const BASE  = process.env.GITHUB_BASE_BRANCH ?? 'main'

  const results: any[] = []

  // 1. 环境变量检查
  results.push({ label: 'GITHUB_TOKEN',        ok: !!(TOKEN && TOKEN.startsWith('github_')), detail: TOKEN ? `${TOKEN.slice(0, 12)}...` : '未设置' })
  results.push({ label: 'GITHUB_SKILLS_OWNER', ok: !!OWNER, detail: OWNER ?? '未设置' })
  results.push({ label: 'GITHUB_SKILLS_REPO',  ok: !!REPO,  detail: REPO  ?? '未设置' })
  results.push({ label: 'GITHUB_BASE_BRANCH',  ok: true,    detail: BASE })

  if (!TOKEN || !OWNER || !REPO) {
    return NextResponse.json({ allOk: false, results })
  }

  const headers: any = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }

  // 2. Token 身份
  try {
    const res  = await fetch('https://api.github.com/user', { headers })
    const data = await res.json()
    results.push({ label: 'Token 身份', ok: res.ok, detail: res.ok ? `login: ${data.login}` : `${res.status}: ${data.message}` })
  } catch (e: any) {
    results.push({ label: 'Token 身份', ok: false, detail: e.message })
  }

  // 3. 仓库访问
  try {
    const res  = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, { headers })
    const data = await res.json()
    results.push({ label: '仓库访问', ok: res.ok, detail: res.ok ? `${data.full_name} (${data.visibility})` : `${res.status}: ${data.message}` })
  } catch (e: any) {
    results.push({ label: '仓库访问', ok: false, detail: e.message })
  }

  // 4. 分支 SHA
  let branchSha = ''
  try {
    const res  = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BASE}`, { headers })
    const data = await res.json()
    branchSha  = data.object?.sha ?? ''
    results.push({ label: `分支 ${BASE}`, ok: res.ok && !!branchSha, detail: branchSha ? `sha: ${branchSha.slice(0, 12)}...` : `${res.status}: ${data.message}` })
  } catch (e: any) {
    results.push({ label: '分支读取', ok: false, detail: e.message })
  }

  // 5. 创建测试分支 → 写文件 → 创建 PR（完整流程）
  const testBranch = `debug-test-${Date.now()}`
  if (branchSha) {
    try {
      // 创建分支
      const brRes  = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs`, {
        method: 'POST', headers,
        body: JSON.stringify({ ref: `refs/heads/${testBranch}`, sha: branchSha }),
      })
      const brData = await brRes.json()
      results.push({ label: '创建分支（写权限）', ok: brRes.ok, detail: brRes.ok ? `${testBranch} ✓` : `${brRes.status}: ${brData.message}` })

      if (brRes.ok) {
        // 写文件
        const fRes  = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/debug-test.md`, {
          method: 'PUT', headers,
          body: JSON.stringify({ message: 'debug test', content: Buffer.from('# debug').toString('base64'), branch: testBranch }),
        })
        const fData = await fRes.json()
        results.push({ label: '写入文件', ok: fRes.ok, detail: fRes.ok ? '✓' : `${fRes.status}: ${fData.message}` })

        if (fRes.ok) {
          // 创建 PR
          const prRes  = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls`, {
            method: 'POST', headers,
            body: JSON.stringify({ title: '[Debug] Test PR', body: '诊断测试，可关闭。', head: testBranch, base: BASE }),
          })
          const prData = await prRes.json()
          results.push({ label: '创建 PR', ok: prRes.ok, detail: prRes.ok ? `PR #${prData.number} ${prData.html_url}` : `${prRes.status}: ${prData.message}` })
        }
      }
    } catch (e: any) {
      results.push({ label: '完整流程', ok: false, detail: e.message })
    }
  }

  return NextResponse.json({ allOk: results.every(r => r.ok), results })
}

/**
 * sync-skills.mjs
 *
 * 同步流程：
 *  1. 遍历 GitHub openclaw/skills 仓库（两层目录结构）
 *  2. 读取每个 skill 的 SKILL.md
 *  3. 调用 https://clawhub.ai/api/v1/skills/<slug> 获取真实数据
 *  4. upsert 到 Supabase（字段与新 schema.sql 完全对齐）
 *
 * 用法：
 *   node scripts/sync-skills.mjs
 *
 * 环境变量（从 .env.local 自动读取）：
 *   GITHUB_TOKEN               GitHub PAT（repo read 权限）
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service Role Key
 *   SYNC_LIMIT                 最多同步多少条（默认 1000）
 *   SYNC_DELAY                 每条之间延迟 ms（默认 300）
 *   CLAWHUB_DELAY              调用 ClawhHub API 后的额外延迟 ms（默认 200）
 *   CLAWHUB_SKIP               设为 "true" 跳过 ClawhHub，纯 GitHub 模式
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─── 加载 .env.local ───────────────────────────────────────────────────────────
const __dir  = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env.local')
try {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
} catch { /* .env.local 不存在时忽略 */ }

// ─── 配置 ──────────────────────────────────────────────────────────────────────
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const SYNC_LIMIT    = parseInt(process.env.SYNC_LIMIT    ?? '1000')
const SYNC_DELAY    = parseInt(process.env.SYNC_DELAY    ?? '300')
const CLAWHUB_DELAY = parseInt(process.env.CLAWHUB_DELAY ?? '200')
const CLAWHUB_SKIP  = process.env.CLAWHUB_SKIP === 'true'

if (!GITHUB_TOKEN)                  { console.error('❌ 缺少 GITHUB_TOKEN');   process.exit(1) }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 缺少 SUPABASE 配置');  process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── GitHub API ────────────────────────────────────────────────────────────────
async function ghFetch(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${url}`)
  return res.json()
}

// ─── ClawhHub API ──────────────────────────────────────────────────────────────
async function fetchClawhHub(slug) {
  if (CLAWHUB_SKIP || !slug) return null
  try {
    const res = await fetch(`https://clawhub.ai/api/v1/skills/${slug}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// 规范化 ClawhHub 响应字段（兼容多种命名风格）
function normalizeClawhHub(raw) {
  if (!raw || typeof raw !== 'object') return null

  const install_count =
    raw.install_count ?? raw.installCount ?? raw.downloads ??
    raw.installs      ?? raw.install      ?? null

  const stars =
    raw.stars      ?? raw.starCount  ?? raw.star_count ??
    raw.likes      ?? raw.favorites  ?? null

  let categories = raw.categories ?? raw.tags ?? raw.category ?? null
  if (typeof categories === 'string')
    categories = categories.split(',').map(s => s.trim()).filter(Boolean)
  if (!Array.isArray(categories) || categories.length === 0)
    categories = null

  return {
    clawhub_id:      raw.id   ?? raw._id   ?? null,
    name:            raw.name ?? raw.title ?? null,
    description:     raw.description ?? raw.summary ?? raw.desc ?? null,
    install_count:   typeof install_count === 'number' ? install_count : null,
    stars:           typeof stars         === 'number' ? stars         : null,
    categories,
    author_username: raw.author_username ?? raw.author?.username ?? raw.author ?? null,
  }
}

// ─── Supabase upsert ───────────────────────────────────────────────────────────
async function upsert(record) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/skills`, {
    method: 'POST',
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         'resolution=merge-duplicates',
    },
    body: JSON.stringify(record),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
}

// ─── 分类解析（从 Markdown 内容关键词推断）────────────────────────────────────
function parseCategories(md) {
  const t = md.toLowerCase()
  const cats = []
  if (t.includes('email')    || t.includes('gmail')       || t.includes('邮件'))        cats.push('邮件处理')
  if (t.includes('calendar') || t.includes('schedule'))                                  cats.push('日历管理')
  if (t.includes('github')   || t.includes('code review') || t.includes('developer'))   cats.push('开发工具')
  if (t.includes('image')    || t.includes('dall-e')      || t.includes('midjourney'))   cats.push('图像生成')
  if (t.includes('slack')    || t.includes('twitter')     || t.includes('telegram'))     cats.push('社交媒体')
  if (t.includes('data')     || t.includes('csv')         || t.includes('analytics'))   cats.push('数据处理')
  if (t.includes('api')      || t.includes('webhook')     || t.includes('integration')) cats.push('API集成')
  if (t.includes('security') || t.includes('owasp')       || t.includes('vulnerability')) cats.push('安全工具')
  if (t.includes('automat')  || t.includes('workflow')    || t.includes('自动化'))       cats.push('自动化任务')
  return cats.length > 0 ? cats.slice(0, 2) : ['自定义']
}

// ─── 主流程 ────────────────────────────────────────────────────────────────────
async function syncSkills() {
  const start = Date.now()
  console.log('='.repeat(60))
  console.log('  Askill — Skills 同步（GitHub + ClawhHub）')
  console.log(`  LIMIT=${SYNC_LIMIT}  DELAY=${SYNC_DELAY}ms  CLAWHUB_SKIP=${CLAWHUB_SKIP}`)
  console.log('='.repeat(60))

  // 第一层：获取用户目录列表
  console.log('\n📋 获取用户目录...')
  let userDirs = []
  for (let page = 1; page <= 20; page++) {
    process.stdout.write(`  第 ${page} 页...`)
    const items = await ghFetch(
      `https://api.github.com/repos/openclaw/skills/contents/skills?per_page=100&page=${page}`
    )
    if (!Array.isArray(items) || items.length === 0) { console.log(' 结束'); break }
    userDirs = userDirs.concat(items.filter(i => i.type === 'dir'))
    console.log(` ${items.length} 个`)
    if (items.length < 100) break
    await sleep(300)
  }
  console.log(`✅ 共 ${userDirs.length} 个用户目录\n`)

  let success = 0, failed = 0, skipped = 0, clawhubHit = 0, total = 0
  const errors = []

  // 第二层：遍历每个 skill
  outer:
  for (const userDir of userDirs) {
    let skillDirs = []
    try {
      const contents = await ghFetch(
        `https://api.github.com/repos/openclaw/skills/contents/skills/${userDir.name}`
      )
      skillDirs = Array.isArray(contents) ? contents.filter(i => i.type === 'dir') : []
    } catch { continue }

    for (const skillDir of skillDirs) {
      if (total >= SYNC_LIMIT) break outer
      total++

      const elapsed = Math.round((Date.now() - start) / 1000)
      const avgMs   = total > 1 ? (Date.now() - start) / (total - 1) : SYNC_DELAY + CLAWHUB_DELAY + 500
      const etaSec  = Math.round(avgMs * (SYNC_LIMIT - total) / 1000)
      const prefix  = `[${String(total).padStart(4)}/${SYNC_LIMIT}]`
      const fullPath = `${userDir.name}/${skillDir.name}`
      const slug = `${userDir.name}-${skillDir.name}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80)

      try {
        // 1. 获取 SKILL.md
        const files  = await ghFetch(
          `https://api.github.com/repos/openclaw/skills/contents/skills/${fullPath}`
        )
        const mdFile = Array.isArray(files)
          ? files.find(f => f.name.toLowerCase() === 'skill.md')
          : null

        if (!mdFile) {
          console.log(`${prefix} ⚠  跳过（无 SKILL.md）${fullPath}`)
          skipped++
          await sleep(100)
          continue
        }

        const markdown = await (await fetch(mdFile.download_url)).text()

        // 从 Markdown 解析基础字段
        const lines    = markdown.split('\n')
        const mdName   = (lines.find(l => l.startsWith('# ')) ?? '')
          .replace(/^#\s+/, '').trim().slice(0, 100) || skillDir.name
        const mdDesc   = (lines.find(l =>
          l.trim() && !l.startsWith('#') && !l.startsWith('---') && l.length > 10
        ) ?? '').trim().slice(0, 200) || skillDir.name
        const mdCats   = parseCategories(markdown)

        // 2. 调用 ClawhHub API（依次尝试三种 slug 格式）
        let ch = null
        if (!CLAWHUB_SKIP) {
          ch = await fetchClawhHub(slug)
            ?? await fetchClawhHub(skillDir.name)
            ?? await fetchClawhHub(`${userDir.name}-${skillDir.name}`)
          if (ch) { clawhubHit++; ch = normalizeClawhHub(ch) }
          await sleep(CLAWHUB_DELAY)
        }

        // 3. 合并字段：ClawhHub 优先，MD/GitHub 兜底
        const now = new Date().toISOString()
        const record = {
          // 标识
          slug,
          // 内容（ClawhHub 优先）
          name:             ch?.name         || mdName,
          description:      ch?.description  || mdDesc,
          full_markdown:    markdown,
          // 来源
          github_repo:      `https://github.com/openclaw/skills/tree/main/skills/${fullPath}`,
          source:           'clawhub',
          // 作者
          author_username:  ch?.author_username || userDir.name,
          author_provider:  null,   // sync 来源无 provider
          // 分类（ClawhHub 优先）
          categories:       (ch?.categories?.length > 0) ? ch.categories : mdCats,
          // 指标（ClawhHub 优先，无则默认 0）
          install_count:    ch?.install_count ?? 0,
          stars:            ch?.stars         ?? 0,
          // 状态
          status:           'published',
          // ClawhHub 同步记录
          clawhub_id:       ch?.clawhub_id    ?? null,
          clawhub_synced_at: ch ? now : null,
          // 时间
          published_at:     now,
        }

        await upsert(record)
        success++

        const chTag = ch
          ? ` ⭐${record.stars} 📦${record.install_count} [CH✓]`
          : ' [CH-]'
        console.log(`${prefix} ✓ ${fullPath}${chTag} | ${elapsed}s eta~${etaSec}s`)

      } catch (err) {
        failed++
        errors.push(`${fullPath}: ${err.message}`)
        console.error(`${prefix} ✗ ${fullPath} — ${err.message}`)
      }

      await sleep(SYNC_DELAY)
    }

    await sleep(100)
  }

  // 报告
  const totalTime = Math.round((Date.now() - start) / 1000)
  console.log('\n' + '='.repeat(60))
  console.log(`✅ 成功:          ${success}`)
  console.log(`❌ 失败:          ${failed}`)
  console.log(`⚠  跳过:          ${skipped}`)
  console.log(`🌐 ClawhHub 命中: ${clawhubHit} / ${success}`)
  console.log(`⏱  总耗时:        ${totalTime}s`)
  if (errors.length > 0) {
    console.log('\n失败详情（前20条）：')
    errors.slice(0, 20).forEach(e => console.log('  ', e))
    if (errors.length > 20) console.log(`  ...另外 ${errors.length - 20} 条`)
  }
  console.log('='.repeat(60))
}

syncSkills().catch(err => { console.error('Fatal:', err); process.exit(1) })

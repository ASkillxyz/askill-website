/**
 * sync-clawhub.mjs
 *
 * 第二步：从数据库读取所有 skill 的 skillDir 部分，
 * 逐条请求 ClawhHub API，补充 install_count / stars 等数据
 * 间隔 5 秒，避免触发 rate limit
 *
 * 用法：
 *   node scripts/sync-clawhub.mjs
 *
 * 环境变量：
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service Role Key
 *   CLAWHUB_DELAY              每次请求间隔 ms（默认 5000）
 *   CLAWHUB_LIMIT              最多处理多少条（默认 9999，全量）
 *   CLAWHUB_DEBUG              设为 "true" 打印首条原始响应，确认字段名
 *   CLAWHUB_ONLY_EMPTY         设为 "true" 只处理 install_count=0 的记录（增量模式）
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

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
} catch {}

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY
const CLAWHUB_DELAY   = parseInt(process.env.CLAWHUB_DELAY  ?? '5000')
const CLAWHUB_LIMIT   = parseInt(process.env.CLAWHUB_LIMIT  ?? '9999')
const CLAWHUB_DEBUG   = process.env.CLAWHUB_DEBUG  === 'true'
const ONLY_EMPTY      = process.env.CLAWHUB_ONLY_EMPTY === 'true'

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 缺少 SUPABASE 配置'); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
let debugPrinted = false

// ─── 从数据库读取所有 slug（分页，每次1000条）────────────────────────────────
async function fetchAllSlugs() {
  const slugs = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    let url = `${SUPABASE_URL}/rest/v1/skills?select=slug&status=eq.published&order=created_at.asc&limit=${pageSize}&offset=${offset}`
    if (ONLY_EMPTY) url += '&install_count=eq.0'

    const res = await fetch(url, {
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept:        'application/json',
      },
    })
    if (!res.ok) throw new Error(`Supabase fetch slugs: ${res.status}`)
    const rows = await res.json()
    if (!rows.length) break
    slugs.push(...rows.map(r => r.slug))
    if (rows.length < pageSize) break
    offset += pageSize
  }
  return slugs
}

// ─── ClawhHub API ──────────────────────────────────────────────────────────────
// slug 存库格式：{userDir}-{skillDir}
// API 请求格式：只用 {skillDir}，即 slug 中最后一个 "-" 之前去掉 userDir 前缀
// 由于 userDir 可能含 "-"，取策略：去掉第一段（第一个 "-" 之前的部分）
// 例：slug = "00010110-openclaw-version-monitor" → skillDir = "openclaw-version-monitor"
function slugToSkillDir(slug) {
  const idx = slug.indexOf('-')
  return idx >= 0 ? slug.slice(idx + 1) : slug
}

async function fetchClawhHub(skillDir) {
  try {
    const res = await fetch(`https://clawhub.ai/api/v1/skills/${skillDir}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (res.status === 429) {
      // 触发 rate limit，等额外 30 秒
      console.warn('  ⚠  Rate limit (429)，等待 30s...')
      await sleep(30000)
      return null
    }
    if (!res.ok) return null

    const raw = await res.json()

    if (CLAWHUB_DEBUG && !debugPrinted && raw) {
      debugPrinted = true
      console.log('\n━━━ ClawhHub 原始响应（首条命中）━━━')
      console.log(JSON.stringify(raw, null, 2))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    }

    return raw
  } catch {
    return null
  }
}

function normalizeClawhHub(raw) {
  if (!raw || typeof raw !== 'object') return null

  const install_count =
    raw.install_count ?? raw.installCount ?? raw.installs ??
    raw.downloads     ?? raw.install      ?? null

  const stars =
    raw.stars     ?? raw.starCount  ?? raw.star_count ??
    raw.favorites ?? raw.likes      ?? null

  let categories = raw.categories ?? raw.tags ?? raw.category ?? null
  if (typeof categories === 'string')
    categories = categories.split(',').map(s => s.trim()).filter(Boolean)
  if (!Array.isArray(categories) || categories.length === 0)
    categories = null

  const author_username =
    raw.author_username ?? raw.author?.username ??
    (typeof raw.author === 'string' ? raw.author : null) ?? null

  return {
    clawhub_id:     raw.id   ?? raw._id   ?? null,
    name:           raw.name ?? raw.title ?? null,
    description:    raw.description ?? raw.summary ?? raw.desc ?? null,
    install_count:  typeof install_count === 'number' ? install_count : null,
    stars:          typeof stars         === 'number' ? stars         : null,
    categories,
    author_username,
  }
}

// ─── 更新单条记录 ──────────────────────────────────────────────────────────────
async function updateSkill(slug, ch) {
  // 只更新 ClawhHub 有值的字段，不覆盖 GitHub 已有的内容
  const patch = { clawhub_synced_at: new Date().toISOString() }

  if (ch.clawhub_id     != null) patch.clawhub_id     = ch.clawhub_id
  if (ch.install_count  != null) patch.install_count  = ch.install_count
  if (ch.stars          != null) patch.stars          = ch.stars
  if (ch.name           != null) patch.name           = ch.name
  if (ch.description    != null) patch.description    = ch.description
  if (ch.categories?.length > 0) patch.categories    = ch.categories
  if (ch.author_username != null) patch.author_username = ch.author_username

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/skills?slug=eq.${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify(patch),
    }
  )
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}: ${await res.text()}`)
}

// ─── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  const start = Date.now()
  console.log('='.repeat(60))
  console.log('  Step 2 — ClawhHub 数据补充')
  console.log(`  DELAY=${CLAWHUB_DELAY}ms  LIMIT=${CLAWHUB_LIMIT}  ONLY_EMPTY=${ONLY_EMPTY}  DEBUG=${CLAWHUB_DEBUG}`)
  console.log('='.repeat(60))

  console.log('\n📋 从数据库读取 slug 列表...')
  const allSlugs = await fetchAllSlugs()
  const slugs    = allSlugs.slice(0, CLAWHUB_LIMIT)
  console.log(`✅ 共 ${allSlugs.length} 条，本次处理 ${slugs.length} 条\n`)

  let hit = 0, miss = 0, failed = 0
  const errors = []

  for (let i = 0; i < slugs.length; i++) {
    const slug      = slugs[i]
    const skillDir  = slugToSkillDir(slug)
    const prefix    = `[${String(i + 1).padStart(4)}/${slugs.length}]`
    const elapsed   = Math.round((Date.now() - start) / 1000)
    const avgMs     = i > 0 ? (Date.now() - start) / i : CLAWHUB_DELAY
    const etaSec    = Math.round(avgMs * (slugs.length - i - 1) / 1000)

    try {
      const raw = await fetchClawhHub(skillDir)

      if (!raw) {
        miss++
        console.log(`${prefix} — miss  ${skillDir} | ${elapsed}s eta~${etaSec}s`)
      } else {
        const ch = normalizeClawhHub(raw)
        await updateSkill(slug, ch)
        hit++
        console.log(`${prefix} ✓ hit   ${skillDir} ⭐${ch.stars ?? '-'} 📦${ch.install_count ?? '-'} | ${elapsed}s eta~${etaSec}s`)
      }
    } catch (err) {
      failed++
      errors.push(`${slug}: ${err.message}`)
      console.error(`${prefix} ✗ err   ${skillDir} — ${err.message}`)
    }

    // 每次请求后等待（最后一条不等）
    if (i < slugs.length - 1) {
      await sleep(CLAWHUB_DELAY)
    }
  }

  const totalTime = Math.round((Date.now() - start) / 1000)
  console.log('\n' + '='.repeat(60))
  console.log(`✅ 命中: ${hit}  — miss: ${miss}  ❌ 失败: ${failed}`)
  console.log(`⏱  总耗时: ${totalTime}s`)
  if (errors.length > 0) {
    console.log('\n失败详情（前20条）：')
    errors.slice(0, 20).forEach(e => console.log('  ', e))
  }
  console.log('='.repeat(60))
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })

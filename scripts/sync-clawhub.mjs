/**
 * sync-clawhub.mjs
 *
 * 第二步：从数据库读取所有 skill slug，
 * 逐条请求 ClawhHub API 补充 install_count / stars 等数据
 * 间隔 5 秒，避免触发 rate limit
 *
 * ClawhHub API 响应结构：
 * {
 *   skill: {
 *     slug, displayName, summary,
 *     stats: { downloads, installsAllTime, installsCurrent, stars, comments, versions }
 *   },
 *   owner: { handle, displayName, userId, image }
 * }
 *
 * 用法：
 *   node scripts/sync-clawhub.mjs
 *
 * 环境变量：
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service Role Key
 *   CLAWHUB_DELAY              每次请求间隔 ms（默认 5000）
 *   CLAWHUB_LIMIT              最多处理多少条（默认 9999）
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

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const CLAWHUB_DELAY = parseInt(process.env.CLAWHUB_DELAY ?? '5000')
const CLAWHUB_LIMIT = parseInt(process.env.CLAWHUB_LIMIT ?? '9999')
const ONLY_EMPTY    = process.env.CLAWHUB_ONLY_EMPTY === 'true'

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 缺少 SUPABASE 配置'); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── 从数据库读取 slug 列表 ────────────────────────────────────────────────────
async function fetchAllSlugs() {
  const slugs = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    let url = `${SUPABASE_URL}/rest/v1/skills?select=slug&status=eq.published&order=created_at.asc&limit=${pageSize}&offset=${offset}`
    if (ONLY_EMPTY) url += '&install_count=eq.0'

    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
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

// ─── slug 转 skillDir ──────────────────────────────────────────────────────────
// DB slug 格式：{userDir}-{skillDir}，例 "00010110-openclaw-version-monitor"
// API 请求只用 skillDir，即去掉第一段（第一个 "-" 之前）
// → "openclaw-version-monitor"
function slugToSkillDir(slug) {
  const idx = slug.indexOf('-')
  return idx >= 0 ? slug.slice(idx + 1) : slug
}

// ─── ClawhHub API ──────────────────────────────────────────────────────────────
async function fetchClawhHub(skillDir) {
  try {
    const res = await fetch(`https://clawhub.ai/api/v1/skills/${skillDir}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (res.status === 429) {
      console.warn('  ⚠  Rate limit (429)，等待 30s...')
      await sleep(30000)
      return null
    }
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ─── 解析 ClawhHub 响应（基于真实 API 结构）──────────────────────────────────
function normalizeClawhHub(raw) {
  if (!raw || typeof raw !== 'object') return null

  const skill = raw.skill   // 主体在 raw.skill 下
  const owner = raw.owner   // 作者在 raw.owner 下

  if (!skill) return null

  const stats = skill.stats ?? {}

  return {
    // 标识
    clawhub_id:      skill.slug ?? null,

    // 内容
    name:            skill.displayName ?? null,
    description:     skill.summary     ?? null,

    // 数据指标
    // installsAllTime = 历史总安装数，更接近我们的 install_count 语义
    install_count:   typeof stats.installsAllTime === 'number' ? stats.installsAllTime : null,
    stars:           typeof stats.stars           === 'number' ? stats.stars           : null,
    downloads:       typeof stats.downloads       === 'number' ? stats.downloads       : null,

    // 作者：优先 handle（即 GitHub 用户名），fallback displayName
    author_username: owner?.handle ?? owner?.displayName ?? null,
    author_avatar:   owner?.image  ?? null,
  }
}

// ─── 更新单条记录（只 PATCH 有值的字段）──────────────────────────────────────
async function updateSkill(slug, ch) {
  const patch = { clawhub_synced_at: new Date().toISOString() }

  if (ch.clawhub_id     != null) patch.clawhub_id     = ch.clawhub_id
  if (ch.install_count  != null) patch.install_count  = ch.install_count
  if (ch.stars          != null) patch.stars          = ch.stars
  if (ch.name           != null) patch.name           = ch.name
  if (ch.description    != null) patch.description    = ch.description
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
  console.log(`  DELAY=${CLAWHUB_DELAY}ms  LIMIT=${CLAWHUB_LIMIT}  ONLY_EMPTY=${ONLY_EMPTY}`)
  console.log('='.repeat(60))

  console.log('\n📋 从数据库读取 slug 列表...')
  const allSlugs = await fetchAllSlugs()
  const slugs    = allSlugs.slice(0, CLAWHUB_LIMIT)
  console.log(`✅ 共 ${allSlugs.length} 条，本次处理 ${slugs.length} 条\n`)

  let hit = 0, miss = 0, failed = 0
  const errors = []

  for (let i = 0; i < slugs.length; i++) {
    const slug     = slugs[i]
    const skillDir = slugToSkillDir(slug)
    const prefix   = `[${String(i + 1).padStart(4)}/${slugs.length}]`
    const elapsed  = Math.round((Date.now() - start) / 1000)
    const avgMs    = i > 0 ? (Date.now() - start) / i : CLAWHUB_DELAY
    const etaSec   = Math.round(avgMs * (slugs.length - i - 1) / 1000)

    try {
      const raw = await fetchClawhHub(skillDir)

      if (!raw) {
        miss++
        console.log(`${prefix} — miss  ${skillDir} | ${elapsed}s eta~${etaSec}s`)
      } else {
        const ch = normalizeClawhHub(raw)
        if (!ch) {
          miss++
          console.log(`${prefix} — parse fail  ${skillDir}`)
        } else {
          await updateSkill(slug, ch)
          hit++
          console.log(`${prefix} ✓ hit   ${skillDir} ⭐${ch.stars ?? '-'} 📦${ch.install_count ?? '-'} | ${elapsed}s eta~${etaSec}s`)
        }
      }
    } catch (err) {
      failed++
      errors.push(`${slug}: ${err.message}`)
      console.error(`${prefix} ✗ err   ${skillDir} — ${err.message}`)
    }

    if (i < slugs.length - 1) await sleep(CLAWHUB_DELAY)
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

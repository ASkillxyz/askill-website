/**
 * sync-skills.mjs
 *
 * 同步流程：
 *  1. 遍历 GitHub openclaw/skills 仓库（两层目录结构）
 *  2. 读取每个 skill 的 SKILL.md
 *  3. 调用 https://clawhub.ai/api/v1/skills/{skillDir} 获取真实数据
 *     注意：slug 存库是 {userDir}-{skillDir}，但 API 只用 {skillDir} 请求
 *  4. upsert 到 Supabase
 *
 * 用法：
 *   node scripts/sync-skills.mjs
 *
 * 环境变量：
 *   GITHUB_TOKEN               GitHub PAT（repo read 权限）
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service Role Key
 *   SYNC_LIMIT                 最多同步多少条（默认 1000）
 *   SYNC_DELAY                 每条之间延迟 ms（默认 300）
 *   CLAWHUB_DELAY              调用 ClawhHub API 后的额外延迟 ms（默认 200）
 *   CLAWHUB_SKIP               设为 "true" 跳过 ClawhHub，纯 GitHub 模式
 *   CLAWHUB_DEBUG              设为 "true" 打印首条 ClawhHub 原始响应，用于确认字段名
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
const GITHUB_TOKEN   = process.env.GITHUB_TOKEN
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const SYNC_LIMIT     = parseInt(process.env.SYNC_LIMIT    ?? '1000')
const SYNC_DELAY     = parseInt(process.env.SYNC_DELAY    ?? '300')
const CLAWHUB_DELAY  = parseInt(process.env.CLAWHUB_DELAY ?? '200')
const CLAWHUB_SKIP   = process.env.CLAWHUB_SKIP   === 'true'
const CLAWHUB_DEBUG  = process.env.CLAWHUB_DEBUG  === 'true'

if (!GITHUB_TOKEN)                  { console.error('❌ 缺少 GITHUB_TOKEN');   process.exit(1) }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 缺少 SUPABASE 配置');  process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
let debugPrinted = false  // 只打印一次原始响应

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
// 只用 skillDir.name 请求，不拼 userDir 前缀
async function fetchClawhHub(skillDirName) {
  if (CLAWHUB_SKIP || !skillDirName) return null
  try {
    const url = `https://clawhub.ai/api/v1/skills/${skillDirName}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const raw = await res.json()

    // 首次命中时打印完整原始响应，用于确认字段名
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

// ─── 规范化 ClawhHub 字段 ──────────────────────────────────────────────────────
// 如果字段名猜错了，开启 CLAWHUB_DEBUG=true 跑一次，看原始响应再更新这里
function normalizeClawhHub(raw) {
  if (!raw || typeof raw !== 'object') return null

  // install_count：兼容多种命名
  const raw_installs =
    raw.install_count ?? raw.installCount ?? raw.installs ??
    raw.downloads     ?? raw.install      ?? null

  // stars：兼容多种命名
  const raw_stars =
    raw.stars     ?? raw.starCount  ?? raw.star_count ??
    raw.favorites ?? raw.likes      ?? null

  // categories：数组或逗号字符串
  let categories = raw.categories ?? raw.tags ?? raw.category ?? null
  if (typeof categories === 'string')
    categories = categories.split(',').map(s => s.trim()).filter(Boolean)
  if (!Array.isArray(categories) || categories.length === 0)
    categories = null

  // author
  const author_username =
    raw.author_username ?? raw.author?.username ??
    (typeof raw.author === 'string' ? raw.author : null) ?? null

  return {
    clawhub_id:     raw.id    ?? raw._id   ?? null,
    name:           raw.name  ?? raw.title ?? null,
    description:    raw.description ?? raw.summary ?? raw.desc ?? null,
    install_count:  typeof raw_installs === 'number' ? raw_installs : null,
    stars:          typeof raw_stars    === 'number' ? raw_stars    : null,
    categories,
    author_username,
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

// ─── 分类推断（Markdown 关键词）──────────────────────────────────────────────
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
  console.log(`  LIMIT=${SYNC_LIMIT}  DELAY=${SYNC_DELAY}ms  CLAWHUB_SKIP=${CLAWHUB_SKIP}  DEBUG=${CLAWHUB_DEBUG}`)
  console.log('='.repeat(60))

  // 第一层：用户目录列表
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

      const elapsed  = Math.round((Date.now() - start) / 1000)
      const avgMs    = total > 1 ? (Date.now() - start) / (total - 1) : SYNC_DELAY + CLAWHUB_DELAY + 500
      const etaSec   = Math.round(avgMs * (SYNC_LIMIT - total) / 1000)
      const prefix   = `[${String(total).padStart(4)}/${SYNC_LIMIT}]`
      const fullPath = `${userDir.name}/${skillDir.name}`

      // DB slug = {userDir}-{skillDir}（唯一标识用）
      const slug = `${userDir.name}-${skillDir.name}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80)

      try {
        // 1. 读取 SKILL.md
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
        const lines    = markdown.split('\n')
        const mdName   = (lines.find(l => l.startsWith('# ')) ?? '')
          .replace(/^#\s+/, '').trim().slice(0, 100) || skillDir.name
        const mdDesc   = (lines.find(l =>
          l.trim() && !l.startsWith('#') && !l.startsWith('---') && l.length > 10
        ) ?? '').trim().slice(0, 200) || skillDir.name
        const mdCats   = parseCategories(markdown)

        // 2. 请求 ClawhHub —— 只用 skillDir.name（不带 userDir 前缀）
        let ch = null
        if (!CLAWHUB_SKIP) {
          const raw = await fetchClawhHub(skillDir.name)
          if (raw) {
            clawhubHit++
            ch = normalizeClawhHub(raw)
          }
          await sleep(CLAWHUB_DELAY)
        }

        // 3. 合并写入
        const now = new Date().toISOString()
        const record = {
          slug,
          name:              ch?.name          || mdName,
          description:       ch?.description   || mdDesc,
          full_markdown:     markdown,
          github_repo:       `https://github.com/openclaw/skills/tree/main/skills/${fullPath}`,
          source:            'clawhub',
          author_username:   ch?.author_username || userDir.name,
          author_provider:   null,
          categories:        (ch?.categories?.length > 0) ? ch.categories : mdCats,
          install_count:     ch?.install_count ?? 0,
          stars:             ch?.stars         ?? 0,
          status:            'published',
          clawhub_id:        ch?.clawhub_id    ?? null,
          clawhub_synced_at: ch ? now : null,
          published_at:      now,
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

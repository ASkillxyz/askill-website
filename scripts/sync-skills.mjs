/**
 * sync-skills.mjs
 *
 * 同步流程：
 *  1. 遍历 GitHub openclaw/skills 仓库（两层目录结构）
 *  2. 读取每个 skill 的 SKILL.md
 *  3. 调用 https://clawhub.ai/api/v1/skills/<slug> 获取真实数据
 *     （install_count / stars / description 等），写入数据库时优先用 ClawhHub 数据
 *  4. upsert 到 Supabase
 *
 * 用法：
 *   node scripts/sync-skills.mjs
 *
 * 环境变量（从 .env.local 读取，或直接 export）：
 *   GITHUB_TOKEN               GitHub PAT（repo read）
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service Role Key
 *   SYNC_LIMIT                 最多同步多少条（默认 1000）
 *   SYNC_DELAY                 每条之间延迟 ms（默认 300）
 *   CLAWHUB_DELAY              调用 ClawhHub API 的额外延迟 ms（默认 200）
 *   CLAWHUB_SKIP               设为 "true" 跳过 ClawhHub 请求（纯 GitHub 模式）
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─── 加载 .env.local ───────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env.local')
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
} catch {
  // .env.local 不存在时忽略，使用已有环境变量
}

// ─── 配置 ──────────────────────────────────────────────────────────────────────
const GITHUB_TOKEN   = process.env.GITHUB_TOKEN
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const SYNC_LIMIT     = parseInt(process.env.SYNC_LIMIT     ?? '1000')
const SYNC_DELAY     = parseInt(process.env.SYNC_DELAY     ?? '300')
const CLAWHUB_DELAY  = parseInt(process.env.CLAWHUB_DELAY  ?? '200')
const CLAWHUB_SKIP   = process.env.CLAWHUB_SKIP === 'true'

if (!GITHUB_TOKEN)             { console.error('❌ 缺少 GITHUB_TOKEN');    process.exit(1) }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 缺少 SUPABASE 配置'); process.exit(1) }

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
// 返回结构（推测 + 容错）：
// {
//   slug, name, description,
//   install_count (或 installCount / downloads),
//   stars (或 starCount / likes),
//   categories (或 tags / category),
//   author (或 author_username),
//   ...
// }
async function fetchClawhHub(slug) {
  if (CLAWHUB_SKIP) return null
  try {
    const res = await fetch(`https://clawhub.ai/api/v1/skills/${slug}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch {
    return null
  }
}

// 从 ClawhHub 响应里规范化字段（兼容多种 key 命名）
function normalizeClawhHub(raw) {
  if (!raw) return null
  return {
    name:          raw.name          ?? raw.title         ?? null,
    description:   raw.description   ?? raw.summary        ?? null,
    install_count: raw.install_count ?? raw.installCount  ?? raw.downloads      ?? raw.installs      ?? null,
    stars:         raw.stars         ?? raw.starCount      ?? raw.star_count     ?? raw.likes         ?? null,
    // categories 可能是数组或逗号分隔字符串
    categories:    normalizeCats(raw.categories ?? raw.tags ?? raw.category),
    author_username: raw.author_username ?? raw.author?.username ?? raw.author ?? null,
  }
}

function normalizeCats(val) {
  if (!val) return null
  if (Array.isArray(val)) return val.map(String)
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
  return null
}

// ─── Supabase upsert ───────────────────────────────────────────────────────────
async function upsert(skill) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/skills`, {
    method: 'POST',
    headers: {
      apikey:          SUPABASE_KEY,
      Authorization:   `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'resolution=merge-duplicates',
    },
    body: JSON.stringify(skill),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase ${res.status}: ${body}`)
  }
}

// ─── 分类解析（从 Markdown 内容猜测）──────────────────────────────────────────
function parseCategories(md) {
  const t = md.toLowerCase()
  const cats = []
  if (t.includes('email') || t.includes('gmail') || t.includes('邮件'))              cats.push('邮件处理')
  if (t.includes('calendar') || t.includes('schedule'))                               cats.push('日历管理')
  if (t.includes('github') || t.includes('code review') || t.includes('developer'))  cats.push('开发工具')
  if (t.includes('image') || t.includes('dall-e') || t.includes('midjourney'))        cats.push('图像生成')
  if (t.includes('slack') || t.includes('twitter') || t.includes('telegram'))        cats.push('社交媒体')
  if (t.includes('data') || t.includes('csv') || t.includes('analytics'))            cats.push('数据处理')
  if (t.includes('api') || t.includes('webhook') || t.includes('integration'))       cats.push('API集成')
  if (t.includes('security') || t.includes('owasp') || t.includes('vulnerability'))  cats.push('安全工具')
  if (t.includes('automat') || t.includes('workflow') || t.includes('自动化'))        cats.push('自动化任务')
  return cats.length > 0 ? cats.slice(0, 2) : ['自定义']
}

// ─── 主流程 ────────────────────────────────────────────────────────────────────
async function syncSkills() {
  const start = Date.now()
  console.log('='.repeat(56))
  console.log('  Askill — Skills 同步（GitHub + ClawhHub）')
  console.log(`  SYNC_LIMIT=${SYNC_LIMIT}  SYNC_DELAY=${SYNC_DELAY}ms  CLAWHUB_SKIP=${CLAWHUB_SKIP}`)
  console.log('='.repeat(56))

  // ── 第一层：获取用户目录 ──────────────────────────────────────────────────────
  console.log('\n📋 获取用户目录列表...')
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

  // 统计
  let success = 0, failed = 0, skipped = 0, clawhubHit = 0, total = 0
  const errors = []

  // ── 第二层：遍历每个 skill ──────────────────────────────────────────────────
  outer:
  for (const userDir of userDirs) {
    let skills = []
    try {
      const contents = await ghFetch(
        `https://api.github.com/repos/openclaw/skills/contents/skills/${userDir.name}`
      )
      skills = Array.isArray(contents) ? contents.filter(i => i.type === 'dir') : []
    } catch {
      continue
    }

    for (const skillDir of skills) {
      if (total >= SYNC_LIMIT) break outer
      total++

      const elapsed  = Math.round((Date.now() - start) / 1000)
      const avgMs    = total > 1 ? (Date.now() - start) / (total - 1) : SYNC_DELAY + CLAWHUB_DELAY + 500
      const etaSec   = Math.round(avgMs * (SYNC_LIMIT - total) / 1000)
      const prefix   = `[${total}/${SYNC_LIMIT}]`
      const fullPath = `${userDir.name}/${skillDir.name}`
      // slug 格式：userDir-skillDir，小写，去除非法字符，最长80位
      const slug = `${userDir.name}-${skillDir.name}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80)

      try {
        // 1. 获取 SKILL.md
        const files = await ghFetch(
          `https://api.github.com/repos/openclaw/skills/contents/skills/${fullPath}`
        )
        const mdFile = Array.isArray(files)
          ? files.find(f => f.name.toLowerCase() === 'skill.md')
          : null

        if (!mdFile) {
          console.log(`${prefix} ⚠  跳过 ${fullPath}（无 SKILL.md）`)
          skipped++
          await sleep(100)
          continue
        }

        const mdRes  = await fetch(mdFile.download_url)
        const markdown = await mdRes.text()

        // 从 Markdown 解析基础字段
        const lines       = markdown.split('\n')
        const titleLine   = lines.find(l => l.startsWith('# '))
        const mdName      = titleLine
          ? titleLine.replace(/^#\s+/, '').trim().slice(0, 100)
          : skillDir.name
        const mdDesc      = lines
          .find(l => l.trim() && !l.startsWith('#') && !l.startsWith('---') && l.length > 10)
          ?.trim().slice(0, 200) || skillDir.name
        const mdCats      = parseCategories(markdown)

        // 2. 调用 ClawhHub API（用 skillDir.name 作为 slug，更接近原始 ID）
        //    也尝试完整 slug，取非空的那个
        let ch = null
        if (!CLAWHUB_SKIP) {
          ch = await fetchClawhHub(slug)
          if (!ch) ch = await fetchClawhHub(skillDir.name)
          if (!ch) ch = await fetchClawhHub(`${userDir.name}-${skillDir.name}`)
          if (ch) {
            clawhubHit++
            ch = normalizeClawhHub(ch)
          }
          await sleep(CLAWHUB_DELAY)
        }

        // 3. 合并：ClawhHub 优先，GitHub/MD 兜底
        const record = {
          slug,
          name:           ch?.name          || mdName,
          description:    ch?.description   || mdDesc,
          full_markdown:  markdown,
          github_repo:    `https://github.com/openclaw/skills/tree/main/skills/${fullPath}`,
          categories:     (ch?.categories && ch.categories.length > 0) ? ch.categories : mdCats,
          author_username: ch?.author_username || userDir.name,
          source:         'clawhub',
          status:         'published',
          install_count:  ch?.install_count  ?? 0,
          stars:          ch?.stars          ?? 0,
          published_at:   new Date().toISOString(),
        }

        await upsert(record)
        success++

        const chTag = ch
          ? ` | ⭐${record.stars} 📦${record.install_count} [ClawhHub ✓]`
          : ' | [ClawhHub -]'
        console.log(`${prefix} ✓ ${fullPath}${chTag} | ${elapsed}s (eta ~${etaSec}s)`)

      } catch (err) {
        failed++
        errors.push(`${fullPath}: ${err.message}`)
        console.error(`${prefix} ✗ ${fullPath} — ${err.message}`)
      }

      await sleep(SYNC_DELAY)
    }

    await sleep(100)
  }

  // ── 报告 ───────────────────────────────────────────────────────────────────
  const totalTime = Math.round((Date.now() - start) / 1000)
  console.log('\n' + '='.repeat(56))
  console.log(`✅ 成功:          ${success}`)
  console.log(`❌ 失败:          ${failed}`)
  console.log(`⚠  跳过:          ${skipped}`)
  console.log(`🌐 ClawhHub 命中: ${clawhubHit} / ${success} 条`)
  console.log(`⏱  总耗时:        ${totalTime}s`)
  if (errors.length > 0) {
    console.log('\n失败列表：')
    errors.slice(0, 20).forEach(e => console.log(' ', e))
    if (errors.length > 20) console.log(`  ...以及另外 ${errors.length - 20} 条`)
  }
  console.log('='.repeat(56))
}

syncSkills().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})

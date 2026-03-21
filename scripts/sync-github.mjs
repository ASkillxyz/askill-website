/**
 * sync-github.mjs
 *
 * 第一步：只从 GitHub 同步新增的 SKILL.md，不调用 ClawhHub
 * 启动时先从数据库加载已有 slug 集合，遍历 GitHub 时跳过已存在的，只处理新增
 *
 * 用法：
 *   node scripts/sync-github.mjs
 *
 * 环境变量：
 *   GITHUB_TOKEN               GitHub PAT（repo read 权限）
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service Role Key
 *   SYNC_LIMIT                 最多新增多少条（默认 9999）
 *   SYNC_DELAY                 每条之间延迟 ms（默认 150）
 *   FORCE_ALL                  设为 "true" 忽略已有记录，强制全量重新同步
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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SYNC_LIMIT   = parseInt(process.env.SYNC_LIMIT ?? '9999')
const SYNC_DELAY   = parseInt(process.env.SYNC_DELAY ?? '150')
const FORCE_ALL    = process.env.FORCE_ALL === 'true'

if (!GITHUB_TOKEN)                  { console.error('❌ 缺少 GITHUB_TOKEN');  process.exit(1) }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 缺少 SUPABASE 配置'); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── 从数据库加载所有已有 slug（分页拉取，构建 Set）────────────────────────────
async function loadExistingSlugs() {
  if (FORCE_ALL) return new Set()

  const slugs = new Set()
  let offset = 0
  const pageSize = 1000

  process.stdout.write('📦 从数据库加载已有 slug...')
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/skills?select=slug&limit=${pageSize}&offset=${offset}`,
      {
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )
    if (!res.ok) throw new Error(`加载已有 slug 失败: ${res.status}`)
    const rows = await res.json()
    rows.forEach(r => slugs.add(r.slug))
    if (rows.length < pageSize) break
    offset += pageSize
  }
  console.log(` ${slugs.size} 条`)
  return slugs
}

// ─── GitHub API ────────────────────────────────────────────────────────────────
async function ghFetch(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${url}`)
  return res.json()
}

// ─── Supabase insert（新增专用，不用 merge-duplicates）──────────────────────
async function insert(record) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/skills`, {
    method: 'POST',
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         'resolution=merge-duplicates',  // 万一 slug 冲突也安全
    },
    body: JSON.stringify(record),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
}

// ─── 分类推断 ──────────────────────────────────────────────────────────────────
function parseCategories(md) {
  const t = md.toLowerCase()
  const cats = []
  if (t.includes('email')    || t.includes('gmail')       || t.includes('邮件'))         cats.push('邮件处理')
  if (t.includes('calendar') || t.includes('schedule'))                                   cats.push('日历管理')
  if (t.includes('github')   || t.includes('code review') || t.includes('developer'))    cats.push('开发工具')
  if (t.includes('image')    || t.includes('dall-e')      || t.includes('midjourney'))    cats.push('图像生成')
  if (t.includes('slack')    || t.includes('twitter')     || t.includes('telegram'))      cats.push('社交媒体')
  if (t.includes('data')     || t.includes('csv')         || t.includes('analytics'))    cats.push('数据处理')
  if (t.includes('api')      || t.includes('webhook')     || t.includes('integration'))  cats.push('API集成')
  if (t.includes('security') || t.includes('owasp')       || t.includes('vulnerability')) cats.push('安全工具')
  if (t.includes('automat')  || t.includes('workflow')    || t.includes('自动化'))        cats.push('自动化任务')
  return cats.length > 0 ? cats.slice(0, 2) : ['自定义']
}

// ─── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  const start = Date.now()
  console.log('='.repeat(60))
  console.log('  Step 1 — GitHub 增量同步（只处理新增）')
  console.log(`  LIMIT=${SYNC_LIMIT}  DELAY=${SYNC_DELAY}ms  FORCE_ALL=${FORCE_ALL}`)
  console.log('='.repeat(60) + '\n')

  // 1. 加载数据库已有 slug
  const existingSlugs = await loadExistingSlugs()

  // 2. 获取 GitHub 用户目录列表
  console.log('📋 获取用户目录...')
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

  let added = 0, skippedExist = 0, skippedNoMd = 0, failed = 0
  const errors = []

  // 3. 遍历每个 skill，跳过已存在的
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
      if (added >= SYNC_LIMIT) break outer

      const fullPath = `${userDir.name}/${skillDir.name}`
      const slug     = `${userDir.name}-${skillDir.name}`
        .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

      // ── 已存在则跳过 ──────────────────────────────────────────────────────────
      if (existingSlugs.has(slug)) {
        skippedExist++
        continue
      }

      const elapsed = Math.round((Date.now() - start) / 1000)
      const prefix  = `[new+${String(added + 1).padStart(3)}]`

      try {
        const files  = await ghFetch(
          `https://api.github.com/repos/openclaw/skills/contents/skills/${fullPath}`
        )
        const mdFile = Array.isArray(files) ? files.find(f => f.name.toLowerCase() === 'skill.md') : null

        if (!mdFile) {
          skippedNoMd++
          console.log(`${prefix} ⚠  跳过（无 SKILL.md）${fullPath}`)
          await sleep(100)
          continue
        }

        const markdown = await (await fetch(mdFile.download_url)).text()
        const lines    = markdown.split('\n')
        const name     = (lines.find(l => l.startsWith('# ')) ?? '').replace(/^#\s+/, '').trim().slice(0, 100) || skillDir.name
        const desc     = (lines.find(l => l.trim() && !l.startsWith('#') && !l.startsWith('---') && l.length > 10) ?? '').trim().slice(0, 200) || skillDir.name

        await insert({
          slug,
          name,
          description:     desc,
          full_markdown:   markdown,
          github_repo:     `https://github.com/openclaw/skills/tree/main/skills/${fullPath}`,
          source:          'clawhub',
          author_username: userDir.name,
          author_provider: null,
          categories:      parseCategories(markdown),
          install_count:   0,
          stars:           0,
          status:          'published',
          published_at:    new Date().toISOString(),
        })

        added++
        console.log(`${prefix} ✓ ${fullPath} | ${elapsed}s`)

      } catch (err) {
        failed++
        errors.push(`${fullPath}: ${err.message}`)
        console.error(`${prefix} ✗ ${fullPath} — ${err.message}`)
      }

      await sleep(SYNC_DELAY)
    }
    await sleep(100)
  }

  const totalTime = Math.round((Date.now() - start) / 1000)
  console.log('\n' + '='.repeat(60))
  console.log(`🆕 新增:       ${added}`)
  console.log(`⏭  已存在跳过: ${skippedExist}`)
  console.log(`⚠  无SKILL.md: ${skippedNoMd}`)
  console.log(`❌ 失败:       ${failed}`)
  console.log(`⏱  总耗时:     ${totalTime}s`)
  if (errors.length > 0) {
    console.log('\n失败详情：')
    errors.slice(0, 20).forEach(e => console.log('  ', e))
  }
  console.log('='.repeat(60))

  if (added > 0) {
    console.log(`\n✅ 新增了 ${added} 条，接下来补充 ClawhHub 数据：`)
    console.log('   CLAWHUB_ONLY_EMPTY=true node scripts/sync-clawhub.mjs')
  } else {
    console.log('\n✅ 没有新增内容，数据库已是最新。')
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })

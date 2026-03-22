/**
 * sync-github.mjs
 *
 * 第一步：只从 GitHub 同步新增的 SKILL.md，不调用 ClawhHub
 * 使用 Git Trees API 一次性获取完整目录结构，无需分页
 * 启动时从数据库加载已有 slug，遍历时跳过已存在的，只处理新增
 *
 * 用法：
 *   node scripts/sync-github.mjs
 *
 * 环境变量：
 *   GITHUB_TOKEN               GitHub PAT（repo read 权限）
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service Role Key
 *   SYNC_LIMIT                 最多新增多少条（不设则同步全部）
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
const SYNC_LIMIT   = process.env.SYNC_LIMIT ? parseInt(process.env.SYNC_LIMIT) : Infinity
const SYNC_DELAY   = parseInt(process.env.SYNC_DELAY ?? '150')
const FORCE_ALL    = process.env.FORCE_ALL === 'true'

if (!GITHUB_TOKEN)                  { console.error('❌ 缺少 GITHUB_TOKEN');  process.exit(1) }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 缺少 SUPABASE 配置'); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── 从数据库加载所有已有 slug ────────────────────────────────────────────────
async function loadExistingSlugs() {
  if (FORCE_ALL) return new Set()

  const slugs = new Set()
  let offset = 0
  const pageSize = 1000

  process.stdout.write('📦 从数据库加载已有 slug...')
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/skills?select=slug&limit=${pageSize}&offset=${offset}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
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

// ─── 用 Trees API 一次拉取完整目录结构 ────────────────────────────────────────
async function fetchSkillTree() {
  const branch = await ghFetch(
    'https://api.github.com/repos/openclaw/skills/branches/main'
  )
  if (!branch) throw new Error('无法获取 main 分支信息')
  const treeSha = branch.commit.commit.tree.sha

  console.log('🌲 拉取完整目录树（Trees API）...')
  const tree = await ghFetch(
    `https://api.github.com/repos/openclaw/skills/git/trees/${treeSha}?recursive=1`
  )
  if (!tree) throw new Error('无法获取目录树')

  if (tree.truncated) {
    console.warn('⚠  目录树被截断（超过 100,000 个文件），部分内容可能缺失')
  }

  const skills = []
  const mdPattern = /^skills\/([^/]+)\/([^/]+)\/SKILL\.md$/i

  for (const item of tree.tree) {
    if (item.type !== 'blob') continue
    const match = item.path.match(mdPattern)
    if (!match) continue
    skills.push({
      userDir:  match[1],
      skillDir: match[2],
      mdUrl: `https://raw.githubusercontent.com/openclaw/skills/main/${item.path}`,
    })
  }

  console.log(`✅ 发现 ${skills.length} 个 skill（含 SKILL.md）\n`)
  return skills
}

// ─── Supabase insert ──────────────────────────────────────────────────────────
async function insert(record) {
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

// ─── 分类推断 ──────────────────────────────────────────────────────────────────
function parseCategories(md) {
  const t = md.toLowerCase()
  const cats = []
  if (t.includes('email')    || t.includes('gmail')       || t.includes('邮件'))          cats.push('邮件处理')
  if (t.includes('calendar') || t.includes('schedule'))                                    cats.push('日历管理')
  if (t.includes('github')   || t.includes('code review') || t.includes('developer'))     cats.push('开发工具')
  if (t.includes('image')    || t.includes('dall-e')      || t.includes('midjourney'))     cats.push('图像生成')
  if (t.includes('slack')    || t.includes('twitter')     || t.includes('telegram'))       cats.push('社交媒体')
  if (t.includes('data')     || t.includes('csv')         || t.includes('analytics'))     cats.push('数据处理')
  if (t.includes('api')      || t.includes('webhook')     || t.includes('integration'))   cats.push('API集成')
  if (t.includes('security') || t.includes('owasp')       || t.includes('vulnerability')) cats.push('安全工具')
  if (t.includes('automat')  || t.includes('workflow')    || t.includes('自动化'))         cats.push('自动化任务')
  return cats.length > 0 ? cats.slice(0, 2) : ['自定义']
}

// ─── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  const start = Date.now()
  console.log('='.repeat(60))
  console.log('  Step 1 — GitHub 增量同步（只处理新增）')
  console.log(`  LIMIT=${SYNC_LIMIT === Infinity ? '∞' : SYNC_LIMIT}  DELAY=${SYNC_DELAY}ms  FORCE_ALL=${FORCE_ALL}`)
  console.log('='.repeat(60) + '\n')

  const [existingSlugs, allSkills] = await Promise.all([
    loadExistingSlugs(),
    fetchSkillTree(),
  ])

  const newSkills = allSkills.filter(({ userDir, skillDir }) => {
    const slug = `${userDir}-${skillDir}`
      .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
    return !existingSlugs.has(slug)
  })

  console.log(`📊 GitHub 总计: ${allSkills.length}  已存在: ${existingSlugs.size}  待新增: ${newSkills.length}\n`)

  if (newSkills.length === 0) {
    console.log('✅ 没有新增内容，数据库已是最新。')
    return
  }

  let added = 0, failed = 0
  const errors = []
  const limit = Math.min(newSkills.length, SYNC_LIMIT)

  for (let i = 0; i < limit; i++) {
    const { userDir, skillDir, mdUrl } = newSkills[i]
    const slug = `${userDir}-${skillDir}`
      .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

    const elapsed = Math.round((Date.now() - start) / 1000)
    const prefix  = `[${String(i + 1).padStart(4)}/${limit === Infinity ? newSkills.length : limit}]`

    try {
      const mdRes  = await fetch(mdUrl)
      if (!mdRes.ok) throw new Error(`下载 SKILL.md 失败: ${mdRes.status}`)
      const markdown = await mdRes.text()

      const lines = markdown.split('\n')
      const name  = (lines.find(l => l.startsWith('# ')) ?? '').replace(/^#\s+/, '').trim().slice(0, 100) || skillDir
      const desc  = (lines.find(l => l.trim() && !l.startsWith('#') && !l.startsWith('---') && l.length > 10) ?? '').trim().slice(0, 200) || skillDir

      await insert({
        slug,
        name,
        description:     desc,
        full_markdown:   markdown,
        github_repo:     `https://github.com/openclaw/skills/tree/main/skills/${userDir}/${skillDir}`,
        source:          'clawhub',
        author_username: userDir,
        author_provider: null,
        categories:      parseCategories(markdown),
        install_count:   0,
        stars:           0,
        status:          'published',
        published_at:    new Date().toISOString(),
      })

      added++
      console.log(`${prefix} ✓ ${userDir}/${skillDir} | ${elapsed}s`)

    } catch (err) {
      failed++
      errors.push(`${userDir}/${skillDir}: ${err.message}`)
      console.error(`${prefix} ✗ ${userDir}/${skillDir} — ${err.message}`)
    }

    await sleep(SYNC_DELAY)
  }

  const totalTime = Math.round((Date.now() - start) / 1000)
  console.log('\n' + '='.repeat(60))
  console.log(`🆕 新增:   ${added}`)
  console.log(`❌ 失败:   ${failed}`)
  console.log(`⏱  总耗时: ${totalTime}s`)
  if (errors.length > 0) {
    console.log('\n失败详情：')
    errors.slice(0, 20).forEach(e => console.log('  ', e))
  }
  console.log('='.repeat(60))

  if (added > 0) {
    console.log(`\n✅ 新增了 ${added} 条，接下来补充 ClawhHub 数据：`)
    console.log('   CLAWHUB_ONLY_EMPTY=true node scripts/sync-clawhub.mjs')
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })

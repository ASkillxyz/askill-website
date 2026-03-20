import type { Skill, Category } from '@/types'

// ─── Categories ───────────────────────────────────────────────────────────────

export const ALL_CATEGORIES: Category[] = [
  'API集成',
  '自动化任务',
  '日历管理',
  '邮件处理',
  '图像生成',
  '数据处理',
  '社交媒体',
  '开发工具',
  '安全工具',
  '创意工具',
  '自定义',
]

export const CATEGORY_TAG_COLORS: Record<string, string> = {
  'API集成':   'tag-blue',
  '自动化任务': 'tag-amber',
  '日历管理':  'tag-blue',
  '邮件处理':  'tag-purple',
  '图像生成':  'tag-amber',
  '数据处理':  'tag-green',
  '社交媒体':  'tag-purple',
  '开发工具':  'tag-blue',
  '安全工具':  'tag-red',
  '创意工具':  'tag-amber',
  '自定义':    'tag-gray',
}

// ─── Mock Skills (replace with Supabase calls in Phase 2) ────────────────────

export const MOCK_SKILLS: Skill[] = [
  {
    id: '1',
    slug: 'gmail-summarizer',
    name: 'Gmail Summarizer',
    description:
      'Auto-summarizes your inbox threads with AI, extracts action items and priorities. Works seamlessly with the MCP Gmail connector.',
    fullMarkdown: `## Gmail Summarizer

A powerful OpenClaw skill that connects to your Gmail via MCP and provides intelligent summaries of your inbox.

### Features
- Summarizes email threads with AI
- Extracts action items and deadlines
- Prioritizes emails by urgency
- Supports batch processing

### Requirements
- OpenClaw CLI v2.0+
- Gmail MCP connector configured
- Google OAuth credentials

### Usage

\`\`\`bash
claw run gmail-summarizer --last 24h
claw run gmail-summarizer --thread <thread-id>
\`\`\`

### Configuration

Add to your \`claw.config.json\`:
\`\`\`json
{
  "skills": {
    "gmail-summarizer": {
      "maxThreads": 50,
      "summarizeStyle": "bullet"
    }
  }
}
\`\`\`
`,
    authorId: 'u1',
    author: { id: 'u1', username: 'alexchen', avatarUrl: undefined },
    githubRepo: 'https://github.com/alexchen/gmail-summarizer',
    categories: ['邮件处理', 'API集成'],
    installCount: 19700,
    stars: 342,
    createdAt: '2026-01-12',
    updatedAt: '2026-02-28',
  },
  {
    id: '2',
    slug: 'calendar-optimizer',
    name: 'Calendar Optimizer',
    description:
      'Analyzes your Google Calendar and suggests meeting consolidations, focus time blocks, and energy-aware scheduling throughout the week.',
    fullMarkdown: `## Calendar Optimizer

Intelligent calendar management skill that analyzes your schedule and provides optimization suggestions.

### Features
- Detects back-to-back meeting overload
- Suggests focus time blocks
- Energy-aware scheduling
- Weekly digest reports

### Usage

\`\`\`bash
claw run calendar-optimizer --week current
claw run calendar-optimizer --suggest-focus-time
\`\`\`
`,
    authorId: 'u2',
    author: { id: 'u2', username: 'yuki_dev', avatarUrl: undefined },
    githubRepo: 'https://github.com/yuki_dev/calendar-optimizer',
    categories: ['日历管理', '自动化任务'],
    installCount: 14200,
    stars: 218,
    createdAt: '2026-02-01',
    updatedAt: '2026-03-01',
  },
  {
    id: '3',
    slug: 'github-pr-reviewer',
    name: 'GitHub PR Reviewer',
    description:
      'Deep code review skill that checks for bugs, security issues, and style inconsistencies in pull requests. Generates detailed reports.',
    fullMarkdown: `## GitHub PR Reviewer

Automated code review powered by OpenClaw that provides comprehensive pull request analysis.

### Features
- OWASP security checks
- Style guide enforcement
- Bug pattern detection
- Inline comment generation

### Usage

\`\`\`bash
claw run github-pr-reviewer --pr <PR_URL>
claw run github-pr-reviewer --repo owner/repo --pr-number 42
\`\`\`
`,
    authorId: 'u3',
    author: { id: 'u3', username: 'rustacean99', avatarUrl: undefined },
    githubRepo: 'https://github.com/rustacean99/github-pr-reviewer',
    categories: ['开发工具', '安全工具'],
    installCount: 31500,
    stars: 521,
    createdAt: '2025-12-08',
    updatedAt: '2026-02-15',
  },
  {
    id: '4',
    slug: 'image-gen-prompt',
    name: 'Image Gen Prompter',
    description:
      'Transforms natural language ideas into optimized prompts for DALL-E, Midjourney, and Stable Diffusion. Supports multiple style presets.',
    fullMarkdown: `## Image Gen Prompter

Generate optimized AI image prompts from simple natural language descriptions.

### Supported Platforms
- DALL-E 3
- Midjourney v6
- Stable Diffusion XL
- Adobe Firefly

### Usage

\`\`\`bash
claw run image-gen-prompt "a cozy coffee shop at night" --platform midjourney
\`\`\`
`,
    authorId: 'u4',
    author: { id: 'u4', username: 'pixelwitch', avatarUrl: undefined },
    githubRepo: 'https://github.com/pixelwitch/image-gen-prompt',
    categories: ['图像生成', '创意工具'],
    installCount: 9800,
    stars: 187,
    createdAt: '2026-01-28',
    updatedAt: '2026-02-20',
  },
  {
    id: '5',
    slug: 'data-csv-analyst',
    name: 'Data CSV Analyst',
    description:
      'Drop in any CSV and get instant analysis: outliers, correlations, charts, and natural language summaries ready in seconds.',
    fullMarkdown: `## Data CSV Analyst

Instant data analysis for any CSV file. No Python setup required.

### Features
- Statistical summaries
- Outlier detection
- Correlation matrix
- Natural language insights
- Chart generation (PNG/SVG)

### Usage

\`\`\`bash
claw run data-csv-analyst --file ./data.csv
claw run data-csv-analyst --file ./data.csv --chart bar
\`\`\`
`,
    authorId: 'u5',
    author: { id: 'u5', username: 'data_gnome', avatarUrl: undefined },
    githubRepo: 'https://github.com/data_gnome/data-csv-analyst',
    categories: ['数据处理', '自动化任务'],
    installCount: 22100,
    stars: 399,
    createdAt: '2025-11-15',
    updatedAt: '2026-01-30',
  },
  {
    id: '6',
    slug: 'slack-digest',
    name: 'Slack Digest Bot',
    description:
      'Summarizes Slack channel activity for any time range, surfaces important decisions and unresolved threads automatically.',
    fullMarkdown: `## Slack Digest Bot

Never miss important Slack conversations again. Get AI-powered digests of any channel.

### Features
- Time-range digests (last 24h, week, custom)
- Decision extraction
- Unresolved thread detection
- Daily/weekly scheduled digests

### Usage

\`\`\`bash
claw run slack-digest --channel #engineering --last 24h
\`\`\`
`,
    authorId: 'u6',
    author: { id: 'u6', username: 'hiro_k', avatarUrl: undefined },
    githubRepo: 'https://github.com/hiro_k/slack-digest',
    categories: ['社交媒体', 'API集成'],
    installCount: 7400,
    stars: 156,
    createdAt: '2026-02-14',
    updatedAt: '2026-03-10',
  },
  {
    id: '7',
    slug: 'sql-schema-gen',
    name: 'SQL Schema Generator',
    description:
      'Generates optimized SQL schemas from plain English descriptions. Supports PostgreSQL, MySQL, and SQLite with best-practice defaults.',
    fullMarkdown: `## SQL Schema Generator

Describe your data model in plain English and get production-ready SQL schemas instantly.

### Supported Databases
- PostgreSQL 15+
- MySQL 8+
- SQLite 3
- Supabase (with RLS policies)

### Usage

\`\`\`bash
claw run sql-schema-gen "a blog with users, posts, and comments"
claw run sql-schema-gen --input ./description.txt --db postgres
\`\`\`
`,
    authorId: 'u7',
    author: { id: 'u7', username: 'dbwhiz', avatarUrl: undefined },
    githubRepo: 'https://github.com/dbwhiz/sql-schema-gen',
    categories: ['开发工具', '数据处理'],
    installCount: 18300,
    stars: 310,
    createdAt: '2026-01-05',
    updatedAt: '2026-02-01',
  },
  {
    id: '8',
    slug: 'security-auditor',
    name: 'Security Auditor',
    description:
      'Scans code for OWASP top 10 vulnerabilities and generates detailed remediation reports with suggested code fixes.',
    fullMarkdown: `## Security Auditor

Comprehensive security scanning skill for your codebase.

### Checks
- SQL Injection
- XSS vulnerabilities
- CSRF issues
- Insecure dependencies
- Secrets in code
- Auth/authz flaws

### Usage

\`\`\`bash
claw run security-auditor --path ./src
claw run security-auditor --file ./api/routes.ts --format json
\`\`\`
`,
    authorId: 'u8',
    author: { id: 'u8', username: 'secureSam', avatarUrl: undefined },
    githubRepo: 'https://github.com/secureSam/security-auditor',
    categories: ['安全工具', '开发工具'],
    installCount: 25900,
    stars: 487,
    createdAt: '2025-10-30',
    updatedAt: '2026-03-01',
  },
  {
    id: '9',
    slug: 'tweet-crafter',
    name: 'Tweet Crafter',
    description:
      'Writes viral-optimized tweets and threads. Adapts to your tone, handles character limits, and suggests relevant hashtags.',
    fullMarkdown: `## Tweet Crafter

AI-powered tweet and thread generation tailored to your voice and audience.

### Features
- Single tweet & thread generation
- Tone matching (professional, casual, funny)
- Hashtag suggestions
- Engagement optimization
- A/B variant generation

### Usage

\`\`\`bash
claw run tweet-crafter "launch announcement for my SaaS" --tone casual
claw run tweet-crafter --thread --topic "10 tips for remote work"
\`\`\`
`,
    authorId: 'u9',
    author: { id: 'u9', username: 'viralvince', avatarUrl: undefined },
    githubRepo: 'https://github.com/viralvince/tweet-crafter',
    categories: ['社交媒体', '创意工具'],
    installCount: 6100,
    stars: 98,
    createdAt: '2026-02-20',
    updatedAt: '2026-03-12',
  },
]

// ─── Site Stats ───────────────────────────────────────────────────────────────

export const SITE_STATS = {
  totalSkills: 2847,
  contributors: 412,
  totalInstalls: 1200000,
  categories: 24,
}

// ─── Install command template ─────────────────────────────────────────────────

export function getInstallCmd(skill: Skill): string {
  return `claw add gh:${skill.author.username}/${skill.slug}`
}

export function formatInstallCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}k`
  return String(n)
}

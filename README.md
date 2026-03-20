# OpenClaw Skills — Phase 1

社区驱动的 OpenClaw AI 技能注册中心。

## 技术栈

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Mock Data**（Phase 2 替换为 Supabase）

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器访问
http://localhost:3000
```

## 项目结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局（含 Navbar / Footer）
│   ├── page.tsx                # 首页（Hero + 统计 + 热门技能）
│   ├── not-found.tsx           # 404 页面
│   ├── skills/
│   │   ├── page.tsx            # 技能列表（搜索 + 筛选）
│   │   └── [slug]/
│   │       └── page.tsx        # 技能详情页
│   └── upload/
│       └── page.tsx            # 上传技能表单
│
├── components/
│   ├── layout/
│   │   └── Navbar.tsx          # 顶部导航栏
│   ├── skills/
│   │   ├── SkillCard.tsx       # 技能卡片
│   │   ├── SkillsGrid.tsx      # 技能网格
│   │   └── CategoryFilter.tsx  # 分类筛选标签
│   └── ui/
│       ├── CopyButton.tsx      # 一键复制按钮
│       └── StatCard.tsx        # 统计数字卡片
│
├── lib/
│   ├── data.ts                 # Mock 数据 + 常量
│   ├── skills.ts               # 数据访问函数（Phase 2 换 Supabase）
│   └── utils.ts                # 工具函数
│
├── styles/
│   └── globals.css             # 全局样式 + Tailwind
│
└── types/
    └── index.ts                # TypeScript 类型定义
```

## 页面说明

| 路由 | 说明 |
|------|------|
| `/` | 首页：Hero、安装命令、统计栏、热门技能 |
| `/skills` | 技能列表：搜索、分类筛选、排序 |
| `/skills/[slug]` | 技能详情：安装命令、Markdown 文档、相关推荐 |
| `/upload` | 上传表单：名称、描述、分类、SKILL.md |

## Phase 2 升级指南

### 1. 接入 Supabase

```bash
npm install @supabase/supabase-js
```

在 `src/lib/skills.ts` 中将 mock 函数替换为 Supabase 查询：

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getSkills(params) {
  const { data } = await supabase
    .from('skills')
    .select('*, author:users(*)')
    .order('install_count', { ascending: false })
  return data
}
```

### 2. 环境变量

创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXTAUTH_SECRET=your-secret
GITHUB_CLIENT_ID=your-github-oauth-id
GITHUB_CLIENT_SECRET=your-github-oauth-secret
```

### 3. 数据库 Schema（Supabase SQL）

```sql
-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  github_id text unique,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- Skills
create table skills (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  full_markdown text,
  author_id uuid references users(id),
  github_repo text not null,
  categories text[] default '{}',
  install_count int default 0,
  stars int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Comments
create table comments (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  user_id uuid references users(id),
  content text not null,
  parent_id uuid references comments(id),
  likes int default 0,
  created_at timestamptz default now()
);

-- Indexes for performance
create index on skills(install_count desc);
create index on skills using gin(categories);
create index on skills(created_at desc);
create index on skills(slug);
```

## 部署（Vercel）

```bash
# 一键部署
npx vercel deploy

# 或连接 GitHub 仓库后自动 CI/CD
```

## Roadmap

- [x] Phase 1：首页 + 列表 + 详情 + 上传表单（mock 数据）
- [ ] Phase 2：Supabase 数据库 + GitHub OAuth 登录 + 评论
- [ ] Phase 3：AI 自动评分（Safety / Clarity / Usefulness）
- [ ] Phase 4：技能版本管理 + 一键安装到 OpenClaw 客户端

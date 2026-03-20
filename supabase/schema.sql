-- ============================================================
-- Askill Skills Registry — Supabase Schema
-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────────────────────
create table if not exists users (
  id           uuid primary key default uuid_generate_v4(),
  username     text unique not null,
  provider     text not null default 'github',  -- github | google | web3
  provider_id  text,                             -- OAuth provider 的原始 ID
  email        text,
  avatar_url   text,
  bio          text,
  github_url   text,
  wallet_address text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Skills ──────────────────────────────────────────────────────────────────
create table if not exists skills (
  id              uuid primary key default uuid_generate_v4(),
  slug            text unique not null,
  name            text not null,
  description     text not null,
  full_markdown   text,
  author_id       uuid references users(id) on delete set null,
  author_username text not null,                -- 冗余存储，方便查询
  author_provider text not null default 'github',
  github_repo     text,
  categories      text[] not null default '{}',
  install_count   integer not null default 0,
  stars           integer not null default 0,
  status          text not null default 'pending',  -- pending | published | rejected
  source          text not null default 'user_upload',
  pr_number       integer,
  pr_url          text,
  ai_safety       numeric(4,1),
  ai_clarity      numeric(4,1),
  ai_usefulness   numeric(4,1),
  ai_overall      numeric(4,1),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Comments ────────────────────────────────────────────────────────────────
create table if not exists comments (
  id         uuid primary key default uuid_generate_v4(),
  skill_id   uuid not null references skills(id) on delete cascade,
  user_id    uuid references users(id) on delete set null,
  username   text not null,
  content    text not null,
  parent_id  uuid references comments(id) on delete cascade,
  likes      integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Installs（记录安装事件，防刷）──────────────────────────────────────────
create table if not exists installs (
  id         uuid primary key default uuid_generate_v4(),
  skill_id   uuid not null references skills(id) on delete cascade,
  ip_hash    text,          -- IP 的 hash，用于去重
  created_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_skills_status         on skills(status);
create index if not exists idx_skills_install_count  on skills(install_count desc);
create index if not exists idx_skills_created_at     on skills(created_at desc);
create index if not exists idx_skills_slug           on skills(slug);
create index if not exists idx_skills_author         on skills(author_username);
create index if not exists idx_skills_categories     on skills using gin(categories);
create index if not exists idx_comments_skill        on comments(skill_id);
create index if not exists idx_installs_skill        on installs(skill_id, created_at desc);

-- ─── Updated_at 自动更新触发器 ───────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger skills_updated_at
  before update on skills
  for each row execute function update_updated_at();

create trigger users_updated_at
  before update on users
  for each row execute function update_updated_at();

-- ─── RLS（Row Level Security）────────────────────────────────────────────────
alter table skills   enable row level security;
alter table users    enable row level security;
alter table comments enable row level security;
alter table installs enable row level security;

-- Skills: 所有人可读 published 的技能
create policy "Skills are publicly readable"
  on skills for select
  using (status = 'published');

-- Skills: service_role 可写（后端 API 用 service_role key，绕过 RLS）
-- （不需要额外策略，service_role 天然绕过 RLS）

-- Comments: 所有人可读
create policy "Comments are publicly readable"
  on comments for select
  using (true);

-- Users: 所有人可读基本信息
create policy "Users are publicly readable"
  on users for select
  using (true);

-- ─── 插入初始 Mock 数据（可选，方便开发调试）────────────────────────────────
-- 运行后数据库中会有 9 条测试技能，状态为 published

insert into skills (slug, name, description, full_markdown, author_username, author_provider, github_repo, categories, install_count, stars, status)
values
  ('gmail-summarizer', 'Gmail Summarizer',
   'Auto-summarizes your inbox threads with AI, extracts action items and priorities.',
   '## Gmail Summarizer\n\nA powerful OpenClaw skill that connects to your Gmail via MCP.\n\n### Usage\n```bash\nclaw run gmail-summarizer --last 24h\n```',
   'alexchen', 'github', 'https://github.com/alexchen/gmail-summarizer',
   ARRAY['邮件处理', 'API集成'], 19700, 342, 'published'),

  ('calendar-optimizer', 'Calendar Optimizer',
   'Analyzes your Google Calendar and suggests meeting consolidations, focus time blocks, and energy-aware scheduling.',
   '## Calendar Optimizer\n\nIntelligent calendar management skill.\n\n### Usage\n```bash\nclaw run calendar-optimizer --week current\n```',
   'yuki_dev', 'github', 'https://github.com/yuki_dev/calendar-optimizer',
   ARRAY['日历管理', '自动化任务'], 14200, 218, 'published'),

  ('github-pr-reviewer', 'GitHub PR Reviewer',
   'Deep code review skill that checks for bugs, security issues, and style inconsistencies in pull requests.',
   '## GitHub PR Reviewer\n\nAutomated code review powered by OpenClaw.\n\n### Usage\n```bash\nclaw run github-pr-reviewer --pr <PR_URL>\n```',
   'rustacean99', 'github', 'https://github.com/rustacean99/github-pr-reviewer',
   ARRAY['开发工具', '安全工具'], 31500, 521, 'published'),

  ('image-gen-prompt', 'Image Gen Prompter',
   'Transforms natural language ideas into optimized prompts for DALL-E, Midjourney, and Stable Diffusion.',
   '## Image Gen Prompter\n\nGenerate optimized AI image prompts.\n\n### Usage\n```bash\nclaw run image-gen-prompt "a cozy coffee shop" --platform midjourney\n```',
   'pixelwitch', 'github', 'https://github.com/pixelwitch/image-gen-prompt',
   ARRAY['图像生成', '创意工具'], 9800, 187, 'published'),

  ('data-csv-analyst', 'Data CSV Analyst',
   'Drop in any CSV and get instant analysis: outliers, correlations, charts, and natural language summaries.',
   '## Data CSV Analyst\n\nInstant data analysis for any CSV file.\n\n### Usage\n```bash\nclaw run data-csv-analyst --file ./data.csv\n```',
   'data_gnome', 'github', 'https://github.com/data_gnome/data-csv-analyst',
   ARRAY['数据处理', '自动化任务'], 22100, 399, 'published'),

  ('slack-digest', 'Slack Digest Bot',
   'Summarizes Slack channel activity for any time range, surfaces important decisions and unresolved threads.',
   '## Slack Digest Bot\n\nNever miss important Slack conversations.\n\n### Usage\n```bash\nclaw run slack-digest --channel #engineering --last 24h\n```',
   'hiro_k', 'github', 'https://github.com/hiro_k/slack-digest',
   ARRAY['社交媒体', 'API集成'], 7400, 156, 'published'),

  ('sql-schema-gen', 'SQL Schema Generator',
   'Generates optimized SQL schemas from plain English descriptions. Supports PostgreSQL, MySQL, and SQLite.',
   '## SQL Schema Generator\n\nDescribe your data model in plain English.\n\n### Usage\n```bash\nclaw run sql-schema-gen "a blog with users, posts, and comments"\n```',
   'dbwhiz', 'github', 'https://github.com/dbwhiz/sql-schema-gen',
   ARRAY['开发工具', '数据处理'], 18300, 310, 'published'),

  ('security-auditor', 'Security Auditor',
   'Scans code for OWASP top 10 vulnerabilities and generates detailed remediation reports.',
   '## Security Auditor\n\nComprehensive security scanning.\n\n### Usage\n```bash\nclaw run security-auditor --path ./src\n```',
   'secureSam', 'github', 'https://github.com/secureSam/security-auditor',
   ARRAY['安全工具', '开发工具'], 25900, 487, 'published'),

  ('tweet-crafter', 'Tweet Crafter',
   'Writes viral-optimized tweets and threads. Adapts to your tone, handles character limits.',
   '## Tweet Crafter\n\nAI-powered tweet generation.\n\n### Usage\n```bash\nclaw run tweet-crafter "launch announcement" --tone casual\n```',
   'viralvince', 'github', 'https://github.com/viralvince/tweet-crafter',
   ARRAY['社交媒体', '创意工具'], 6100, 98, 'published')
on conflict (slug) do nothing;

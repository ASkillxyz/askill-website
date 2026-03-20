-- ============================================================
-- Askill Skills Registry — 完整 Schema（全新版）
-- 清空数据库后在 Supabase SQL Editor 中完整执行此文件
-- ============================================================


-- ─── Skills ──────────────────────────────────────────────────────────────────
-- 字段来源对照：
--   sync-skills.mjs  → slug / name / description / full_markdown / github_repo /
--                       categories / author_username / source / status /
--                       install_count / stars / published_at / clawhub_id / clawhub_synced_at
--   api/upload       → slug / name / description / full_markdown / github_repo /
--                       categories / author_username / author_provider /
--                       source / status / pr_number / pr_url
--   api/webhook      → status / published_at  （PR 合并后更新）
--   lib/skills.ts    → 全字段读取

create table skills (
  -- 主键
  id               uuid primary key default gen_random_uuid(),

  -- 核心标识
  slug             text unique not null,
  name             text not null,
  description      text not null default '',
  full_markdown    text not null default '',

  -- 来源信息
  github_repo      text,                         -- GitHub 仓库/目录链接
  source           text not null default 'clawhub',  -- clawhub | user_upload

  -- 作者信息（无独立 users 表，直接存文本，足够轻量）
  author_username  text not null default '',
  author_provider  text,                         -- github | google | web3 | null（sync 来源无 provider）

  -- 分类
  categories       text[] not null default '{}',

  -- 数据指标（来自 ClawhHub API 或用户行为）
  install_count    integer not null default 0,
  stars            integer not null default 0,

  -- 状态流转：pending → published | rejected
  status           text not null default 'published',

  -- 用户上传走 PR 流程时的字段
  pr_number        integer,
  pr_url           text,

  -- ClawhHub 同步相关
  clawhub_id       text,                         -- ClawhHub 返回的原始 ID，便于增量同步
  clawhub_synced_at timestamptz,                 -- 最后一次从 ClawhHub 同步的时间

  -- 时间戳
  published_at     timestamptz default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);


-- ─── 自动维护 updated_at ─────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger skills_updated_at
  before update on skills
  for each row execute function update_updated_at();


-- ─── 索引 ────────────────────────────────────────────────────────────────────

-- 首页 trending：stars 优先，install_count 次之
create index idx_skills_trending
  on skills(stars desc, install_count desc);

-- 列表页排序
create index idx_skills_install_count  on skills(install_count desc);
create index idx_skills_created_at     on skills(created_at desc);

-- 状态、来源筛选
create index idx_skills_status         on skills(status);
create index idx_skills_source         on skills(source);

-- 按作者查询（上传页 GET /api/upload 用）
create index idx_skills_author         on skills(author_username);

-- 分类筛选（GIN 支持 @> 数组包含查询）
create index idx_skills_categories     on skills using gin(categories);

-- slug 直接查询（unique 已建 btree，这里不重复）

-- ClawhHub 增量同步
create index idx_skills_clawhub_id     on skills(clawhub_id)
  where clawhub_id is not null;

-- 全文搜索（英文 + 中文混合，simple 分词器更安全）
create index idx_skills_fts            on skills using gin(
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))
);


-- ─── RLS（Row Level Security）────────────────────────────────────────────────
alter table skills enable row level security;

-- 公开读取 published 状态的技能（anon key 可访问）
create policy "Public read published skills"
  on skills for select
  using (status = 'published');

-- service_role 天然绕过 RLS，无需额外策略
-- （sync 脚本 / upload API / webhook 均使用 service_role key）


-- ─── 验证：执行后用这段确认结构 ──────────────────────────────────────────────
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_name = 'skills'
order by ordinal_position;

-- ============================================================
-- Migration: 针对同步脚本的表结构加固
-- 在 Supabase Dashboard → SQL Editor 中执行
-- 你的现有数据不会受影响（全部 ALTER COLUMN，非重建）
-- ============================================================

-- ─── 1. description 允许空字符串（同步时偶尔解析失败）────────────────────────
-- 你原表是 NOT NULL DEFAULT ''，已经安全，这里只是确认
ALTER TABLE skills
  ALTER COLUMN description SET DEFAULT '';

-- ─── 2. author_provider 允许 NULL（clawhub 同步来源不一定有 provider）────────
ALTER TABLE skills
  ALTER COLUMN author_provider DROP NOT NULL;

-- ─── 3. 新增 clawhub_id 字段（可选）──────────────────────────────────────────
-- 存 ClawhHub 返回的原始 id，方便后续增量同步时做精准匹配
-- 如果 ClawhHub API 没有返回 id 字段，这列就一直是 NULL，无害
ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS clawhub_id text;

-- ─── 4. 新增 clawhub_synced_at（可选）────────────────────────────────────────
-- 记录最后一次从 ClawhHub 同步的时间，方便做增量同步
ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS clawhub_synced_at timestamptz;

-- ─── 5. 给 stars 加复合索引（首页 trending 用 stars + install_count 排序）─────
CREATE INDEX IF NOT EXISTS idx_skills_stars
  ON skills(stars DESC, install_count DESC);

-- ─── 6. 给 source 字段加索引（按来源筛选）────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_skills_source
  ON skills(source);

-- ─── 验证：查看当前表结构 ────────────────────────────────────────────────────
-- 执行完后运行这段确认字段都对了：
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'skills'
ORDER BY ordinal_position;

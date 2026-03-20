# Askill — Phase 2 Supabase 接入指南

## 快速开始（5步完成）

---

## Step 1：安装依赖

```bash
cd /Users/difeng/Desktop/askill-website

npm install @supabase/supabase-js
```

---

## Step 2：创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com) → 新建项目
2. 项目名称：`askill`，数据库密码自定义（保存好）
3. 地区选择：**Singapore** (ap-southeast-1) — 离你最近

---

## Step 3：初始化数据库

在 Supabase Dashboard → **SQL Editor** → 粘贴并执行：

```
supabase/schema.sql
```

执行完成后，你会看到：
- `skills` 表（含 9 条初始测试数据，status=published）
- `users` 表
- `comments` 表
- `installs` 表
- 相关索引和 RLS 策略

---

## Step 4：配置环境变量

```bash
cp .env.local.example .env.local
```

然后编辑 `.env.local`，填入以下值：

### 4.1 Supabase Keys（必须）

在 Supabase Dashboard → **Settings → API** 中获取：

| 变量名 | 从哪获取 |
|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key（保密！） |

### 4.2 NextAuth Secret（必须）

```bash
openssl rand -base64 32
# 把输出填入 NEXTAUTH_SECRET
```

### 4.3 GitHub OAuth（登录功能，可选）

1. 访问 https://github.com/settings/developers
2. New OAuth App：
   - Application name: `Askill Dev`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
3. 填入 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET`

### 4.4 Google OAuth（登录功能，可选）

1. 访问 https://console.cloud.google.com
2. APIs & Services → Credentials → Create OAuth 2.0 Client
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. 填入 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`

### 4.5 GitHub Token（上传技能功能，可选）

1. https://github.com/settings/tokens → Fine-grained tokens → Generate new token
2. 权限：`Contents`(read&write) + `Pull requests`(read&write)
3. 新建一个公开仓库用于存储 SKILL.md 文件，例如 `askill-skills`
4. 填入 `GITHUB_TOKEN`、`GITHUB_SKILLS_OWNER`、`GITHUB_SKILLS_REPO`

### 4.6 GitHub Webhook Secret（自动发布，可选）

```bash
openssl rand -hex 32
# 把输出填入 GITHUB_WEBHOOK_SECRET
# 同样的值配置到 GitHub repo → Settings → Webhooks
```

---

## Step 5：启动并验证

```bash
npm run dev
```

打开 http://localhost:3000，如果看到技能列表加载正常，Supabase 接入成功！

**验证方法：** 打开浏览器 DevTools → Network，查看 `/api` 请求是否返回真实数据。

---

## 常见问题

### Q: 页面显示空白 / 数据加载失败？
**A:** 检查 `.env.local` 中的 Supabase URL 和 ANON_KEY 是否正确。如果 Supabase 未配置，代码会自动降级到 Mock 数据。

### Q: 上传技能后提示"数据库写入失败"？
**A:** 确保 `SUPABASE_SERVICE_ROLE_KEY` 已配置。Service Role Key 绕过 RLS，仅在后端使用，不要暴露给前端。

### Q: GitHub PR 创建失败？
**A:** 检查 `GITHUB_TOKEN` 权限，确保对 `GITHUB_SKILLS_REPO` 仓库有写入权限。

### Q: 技能提交后没有自动发布？
**A:** 配置 GitHub Webhook：
- 仓库 Settings → Webhooks → Add webhook
- Payload URL: `https://你的域名/api/webhook/github`
- Content type: `application/json`
- Secret: 与 `GITHUB_WEBHOOK_SECRET` 相同
- Events: `Pull requests`

---

## 部署到 Vercel

```bash
npx vercel
```

在 Vercel Dashboard → Project → Settings → Environment Variables 中添加所有 `.env.local` 变量（生产环境的值）。

生产环境注意修改：
- `NEXTAUTH_URL` → `https://你的域名.com`
- OAuth 回调 URL 同步修改为生产域名

---

## 数据库 Schema 说明

| 表名 | 用途 |
|------|------|
| `skills` | 技能主表，status: pending/published/rejected |
| `users` | 用户表（OAuth 和 Web3 钱包） |
| `comments` | 评论表（支持嵌套回复） |
| `installs` | 安装事件记录（防刷用） |

RLS 策略：
- `skills`: 只读 `published` 状态（写操作通过 service_role 后端完成）
- `users` / `comments`: 公开可读

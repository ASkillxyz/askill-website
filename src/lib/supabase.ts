import { createClient } from '@supabase/supabase-js'

// ─── Public client（前端用，受 RLS 限制）────────────────────────────────────
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Admin client（后端 API 用，绕过 RLS）──────────────────────────────────
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
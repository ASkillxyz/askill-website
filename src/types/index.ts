// ─── Core Domain Types ───────────────────────────────────────────────────────

export type Category =
  | 'API集成'
  | '自动化任务'
  | '日历管理'
  | '邮件处理'
  | '图像生成'
  | '数据处理'
  | '社交媒体'
  | '开发工具'
  | '安全工具'
  | '创意工具'
  | '自定义'

export interface Skill {
  id: string
  slug: string
  name: string
  description: string        // short, 1–2 sentences
  fullMarkdown: string       // full SKILL.md content
  authorId: string
  author: Author
  githubRepo: string
  categories: Category[]
  installCount: number
  stars: number
  createdAt: string          // ISO date string
  updatedAt: string
  aiScore?: AiScore
}

export interface Author {
  id: string
  username: string
  avatarUrl?: string
  githubId?: string
  bio?: string
  skillCount?: number
}

export interface Comment {
  id: string
  skillId: string
  userId: string
  author: Author
  content: string
  parentId?: string
  likes: number
  createdAt: string
  replies?: Comment[]
}

export interface AiScore {
  safety: number      // 0-10
  clarity: number
  usefulness: number
  performance: number
  documentation: number
  overall: number
}

// ─── API / Fetch Types ────────────────────────────────────────────────────────

export interface SkillsQueryParams {
  q?: string
  category?: Category | 'all'
  sort?: 'hot' | 'new' | 'az'
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type SortOption = 'hot' | 'new' | 'az'

export interface TagColorMap {
  [key: string]: string
}

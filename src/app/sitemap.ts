import { MetadataRoute } from 'next'
import { getSkills } from '@/lib/skills'

const SITE_URL = 'https://askill.xyz'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静态页面
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url:              SITE_URL,
      lastModified:     new Date(),
      changeFrequency:  'daily',
      priority:         1.0,
    },
    {
      url:              `${SITE_URL}/skills`,
      lastModified:     new Date(),
      changeFrequency:  'hourly',
      priority:         0.9,
    },
    {
      url:              `${SITE_URL}/upload`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.5,
    },
  ]

  // 动态技能页面（分批拉取，最多 5000 条）
  const skillRoutes: MetadataRoute.Sitemap = []
  try {
    let page = 1
    const limit = 100
    while (true) {
      const { data, hasMore } = await getSkills({ sort: 'new', page, limit })
      for (const skill of data) {
        skillRoutes.push({
          url:             `${SITE_URL}/skills/${skill.slug}`,
          lastModified:    new Date(skill.updatedAt || skill.createdAt),
          changeFrequency: 'weekly',
          priority:        0.7,
        })
      }
      if (!hasMore) break
      page++
      if (page > 50) break // 最多 5000 条
    }
  } catch (e) {
    console.error('sitemap: 拉取 skills 失败', e)
  }

  return [...staticRoutes, ...skillRoutes]
}

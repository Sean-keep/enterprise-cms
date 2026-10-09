import type { MetadataRoute } from 'next'
import { publicApi } from '@/lib/api'

/**
 * sitemap。数据源是后端的已发布内容 —— 未发布的内容不会出现在这里，
 * 也不会出现在页面上。改内容后 backend 会打 `sitemap` tag，这里跟着失效。
 */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:8890').replace(/\/$/, '')

export const revalidate = false

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/news`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/products`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const [pages, posts, products] = await Promise.all([
    publicApi.page('home').catch(() => null),
    publicApi.posts({ pageSize: 100 }).catch(() => null),
    publicApi.products({ pageSize: 100 }).catch(() => null),
  ])
  void pages

  // 内容页（关于/联系/自定义）通过逐个 slug 拿 —— 公开接口没有列表，
  // 骨架阶段从已知菜单项推。生产应给后端加一个 /api/public/pages 的列表接口。
  for (const slug of ['about', 'contact', 'privacy']) {
    try {
      await publicApi.page(slug)
      entries.push({
        url: `${SITE_URL}/${slug}`,
        changeFrequency: 'monthly',
        priority: 0.6,
        lastModified: new Date(),
      })
    } catch {
      /* 不存在就不进 sitemap */
    }
  }

  for (const p of posts?.items ?? []) {
    entries.push({
      url: `${SITE_URL}/news/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  for (const p of products?.items ?? []) {
    entries.push({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  return entries
}

import type { Metadata } from 'next'
import { publicApi, ApiRequestError } from '@/lib/api'
import { PageTemplate } from '@/templates/PageTemplate'
import { buildMetadata } from '@/lib/seo'

/**
 * 首页。SSG + on-demand revalidate。
 * slug 固定是 "home"，跟后台 pages 表里那条对上。
 */
export const revalidate = false // 只靠 tag 失效，不靠时间兜底

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await publicApi.page('home')
    return buildMetadata(page)
  } catch {
    return {}
  }
}

export default async function HomePage() {
  let page
  try {
    page = await publicApi.page('home')
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) {
      return (
        <div className="container section">
          <div className="alert alert-info">
            还没有配置首页。到后台 → 页面 → 新建一个 slug 为 <code>home</code>、模板为「首页」的页面。
          </div>
        </div>
      )
    }
    throw e
  }

  const content = page.content as Record<string, unknown>
  const needPosts = content.showNews !== false
  const needProducts = content.showProducts !== false

  // 首页预览区。取不到内容不影响主区渲染 —— 别让一块预览把整页拖垮
  const [posts, products] = await Promise.all([
    needPosts ? publicApi.posts({ pageSize: content.newsLimit ?? 6 }).catch(() => null) : Promise.resolve(null),
    needProducts
      ? publicApi.products({ pageSize: content.productLimit ?? 6, featured: undefined }).catch(() => null)
      : Promise.resolve(null),
  ])

  return (
    <PageTemplate
      page={page}
      preview={{
        posts: posts?.items ?? [],
        products: products?.items ?? [],
      }}
    />
  )
}

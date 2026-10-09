import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { publicApi, ApiRequestError } from '@/lib/api'
import { PageTemplate } from '@/templates/PageTemplate'
import { buildMetadata } from '@/lib/seo'
import { PAGE_TEMPLATES } from '@cms/shared'

/**
 * 通用内容页：关于、联系、自定义页。
 *
 * 首页不走这里（有自己的路由）。`home` 被这个 catch-all 抢走会出问题，
 * 所以显式拦一下。
 */
export const dynamicParams = true

/** 已发布页面的 slug 集合 —— SSG 预渲染用。取不到就退回按需渲染。 */
export async function generateStaticParams() {
  try {
    const site = await publicApi.site()
    // 从 sitemap 数据源拿：pages 的 slug 通过逐个探测成本太高，
    // 骨架阶段直接不预渲染，靠 ISR 的首次访问生成 + tag 失效。
    void site
    return []
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const page = await publicApi.page(slug)
    return buildMetadata(page)
  } catch {
    return {}
  }
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // 首页有自己的路由文件，这里兜住等于抢了它的活
  if (slug === 'home') notFound()
  // 保留段，不该被内容页吃掉
  if (['news', 'products', 'admin', 'api', 'uploads', 'sitemap.xml', 'robots.txt'].includes(slug)) {
    notFound()
  }

  let page
  try {
    page = await publicApi.page(slug)
  } catch (e) {
    if (e instanceof ApiRequestError && (e.status === 404 || e.status === 0)) notFound()
    throw e
  }

  // draft 内容在公开接口就被挡掉了，走到这里必然是已发布的
  if (!PAGE_TEMPLATES.includes(page.template)) notFound()

  return <PageTemplate page={page} />
}

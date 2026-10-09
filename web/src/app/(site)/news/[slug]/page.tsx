import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { publicApi, ApiRequestError } from '@/lib/api'
import { renderRichText } from '@/lib/sanitize'
import { buildPostMetadata } from '@/lib/seo'

/**
 * 新闻详情。ISR + on-demand revalidate。
 *
 * dynamicParams 必须是 true —— generateStaticParams 只预渲染最近若干条，
 * 否则几千篇文章会把构建撑爆。旧文靠首次访问动态渲染后进缓存。
 */
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const recent = await publicApi.posts({ pageSize: 20 })
    return recent.items.map((p) => ({ slug: p.slug }))
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
    return buildPostMetadata(await publicApi.post(slug))
  } catch {
    return {}
  }
}

export default async function PostDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let post
  try {
    post = await publicApi.post(slug)
  } catch (e) {
    // 404 是正常业务结果（未发布 / 不存在），不该冒泡成 500
    if (e instanceof ApiRequestError && (e.status === 404 || e.status === 0)) notFound()
    throw e
  }

  return (
    <>
      <section className="page-title-band">
        <div className="container-narrow">
          <Link href="/news" className="btn-link">
            ← 返回新闻列表
          </Link>
          <h1 style={{ marginTop: 14 }}>{post.title}</h1>
          <div className="muted" style={{ fontSize: 13.5 }}>
            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('zh-CN') : ''}
            {post.category ? ` · ${post.category.name}` : ''}
          </div>
        </div>
      </section>

      <article className="section">
        <div className="container-narrow">
          {post.summary ? (
            <p style={{ fontSize: 17, color: 'var(--fg-soft)', borderLeft: '3px solid var(--brand)', paddingLeft: 16 }}>
              {post.summary}
            </p>
          ) : null}
          <div
            className="rich-content mt-24"
            dangerouslySetInnerHTML={{ __html: renderRichText(post.body) }}
          />
        </div>
      </article>
    </>
  )
}

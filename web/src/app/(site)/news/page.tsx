import type { Metadata } from 'next'
import Link from 'next/link'
import { publicApi } from '@/lib/api'
import { PostCard } from '@/templates/PageTemplate'
import { buildMetadataFrom } from '@/lib/seo'

export const metadata: Metadata = buildMetadataFrom({
  title: '新闻动态',
  description: '公司新闻与行业观察。',
  path: '/news',
})

export default async function NewsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const pageSize = 12

  const [result, categories] = await Promise.all([
    publicApi.posts({ page, pageSize, categorySlug: sp.category }).catch(() => null),
    publicApi.postCategories().catch(() => []),
  ])

  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <section className="page-title-band">
        <div className="container">
          <h1>新闻动态</h1>
          <p className="lead">公司新闻与行业观察。</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {categories.length > 0 ? (
            <div className="row" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
              <Link href="/news" className={`btn btn-sm ${!sp.category ? 'btn-primary' : ''}`}>
                全部
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/news?category=${c.slug}`}
                  className={`btn btn-sm ${sp.category === c.slug ? 'btn-primary' : ''}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          ) : null}

          {result?.items.length ? (
            <div className="grid-3">
              {result.items.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <div className="empty">还没有发布任何新闻。</div>
          )}

          {totalPages > 1 ? (
            <nav className="pagination" aria-label="分页">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                const href = `/news?${new URLSearchParams({
                  ...(sp.category ? { category: sp.category } : {}),
                  ...(n > 1 ? { page: String(n) } : {}),
                }).toString()}`
                return n === page ? (
                  <span key={n} className="current">
                    {n}
                  </span>
                ) : (
                  <Link key={n} href={href}>
                    {n}
                  </Link>
                )
              })}
            </nav>
          ) : null}
        </div>
      </section>
    </>
  )
}

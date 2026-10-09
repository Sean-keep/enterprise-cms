import type { Metadata } from 'next'
import Link from 'next/link'
import { publicApi } from '@/lib/api'
import { ProductCard } from '@/templates/PageTemplate'
import { buildMetadataFrom } from '@/lib/seo'
import { PRODUCT_KIND_LABELS, type ProductKind } from '@cms/shared'

export const metadata: Metadata = buildMetadataFrom({
  title: '产品与服务',
  description: '我们的产品、服务与客户案例。',
  path: '/products',
})

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string; category?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const pageSize = 12

  const [result, categories] = await Promise.all([
    publicApi
      .products({
        page,
        pageSize,
        kind: sp.kind,
        categorySlug: sp.category,
      })
      .catch(() => null),
    publicApi.productCategories().catch(() => []),
  ])

  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const qs = (patch: Record<string, string | undefined>) =>
    `/products?${new URLSearchParams(
      Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][],
    ).toString()}`

  return (
    <>
      <section className="page-title-band">
        <div className="container">
          <h1>产品与服务</h1>
          <p className="lead">从标准化产品到定制实施，覆盖企业数字化的完整链路。</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {/* 两种筛选：按类型（产品/服务/案例）和按分类。维度不同，别混成一排 */}
          <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <Link href="/products" className={`btn btn-sm ${!sp.kind ? 'btn-primary' : ''}`}>
              全部
            </Link>
            {(Object.keys(PRODUCT_KIND_LABELS) as ProductKind[]).map((k) => (
              <Link
                key={k}
                href={qs({ kind: k, page: undefined })}
                className={`btn btn-sm ${sp.kind === k ? 'btn-primary' : ''}`}
              >
                {PRODUCT_KIND_LABELS[k]}
              </Link>
            ))}
          </div>

          {categories.length > 0 ? (
            <div className="row" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={qs({ category: sp.category === c.slug ? undefined : c.slug, page: undefined })}
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
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty">没有匹配的内容。</div>
          )}

          {totalPages > 1 ? (
            <nav className="pagination" aria-label="分页">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) =>
                n === page ? (
                  <span key={n} className="current">
                    {n}
                  </span>
                ) : (
                  <Link key={n} href={qs({ page: n > 1 ? String(n) : undefined })}>
                    {n}
                  </Link>
                ),
              )}
            </nav>
          ) : null}
        </div>
      </section>
    </>
  )
}

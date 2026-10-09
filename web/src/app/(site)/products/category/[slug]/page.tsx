import type { Metadata } from 'next'
import Link from 'next/link'
import { publicApi } from '@/lib/api'
import { ProductCard } from '@/templates/PageTemplate'
import { buildMetadataFrom } from '@/lib/seo'

/**
 * 按分类看产品。菜单的 linkType=category 会指到这里 ——
 * 没有这条路由的话，运营在菜单里选个分类就跳 404。
 */
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const cats = await publicApi.productCategories()
    return cats.map((c) => ({ slug: c.slug }))
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
  const cats = await publicApi.productCategories().catch(() => [])
  const cat = cats.find((c) => c.slug === slug)
  return buildMetadataFrom({
    title: cat?.name ?? '产品分类',
    description: cat?.description,
    path: `/products/category/${slug}`,
  })
}

export default async function ProductCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [result, cats] = await Promise.all([
    publicApi.products({ categorySlug: slug, pageSize: 24 }).catch(() => null),
    publicApi.productCategories().catch(() => []),
  ])
  const cat = cats.find((c) => c.slug === slug)

  return (
    <>
      <section className="page-title-band">
        <div className="container">
          <Link href="/products" className="btn-link">
            ← 全部产品与服务
          </Link>
          <h1 style={{ marginTop: 14 }}>{cat?.name ?? '产品分类'}</h1>
          {cat?.description ? <p className="lead">{cat.description}</p> : null}
        </div>
      </section>

      <section className="section">
        <div className="container">
          {result?.items.length ? (
            <div className="grid-3">
              {result.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty">该分类下还没有内容。</div>
          )}
        </div>
      </section>
    </>
  )
}

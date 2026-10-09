import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { publicApi, ApiRequestError } from '@/lib/api'
import { renderRichText } from '@/lib/sanitize'
import { buildProductMetadata } from '@/lib/seo'
import { PRODUCT_KIND_LABELS } from '@cms/shared'

export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const recent = await publicApi.products({ pageSize: 20 })
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
    return buildProductMetadata(await publicApi.product(slug))
  } catch {
    return {}
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let product
  try {
    product = await publicApi.product(slug)
  } catch (e) {
    if (e instanceof ApiRequestError && (e.status === 404 || e.status === 0)) notFound()
    throw e
  }

  return (
    <>
      <section className="page-title-band">
        <div className="container-narrow">
          <Link href="/products" className="btn-link">
            ← 返回列表
          </Link>
          <div className="mt-8">
            <span className="tag tag-brand">{PRODUCT_KIND_LABELS[product.kind]}</span>
            {product.category ? <span className="tag" style={{ marginLeft: 8 }}>{product.category.name}</span> : null}
          </div>
          <h1 style={{ marginTop: 12 }}>{product.title}</h1>
          {product.subtitle ? <p className="lead">{product.subtitle}</p> : null}
        </div>
      </section>

      <article className="section">
        <div className="container-narrow">
          {product.highlights?.length ? (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 className="card-title">核心能力</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--fg-soft)', lineHeight: 1.9 }}>
                {product.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {product.kind === 'case' && (product.clientName || product.industry) ? (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 className="card-title">案例概况</h3>
              <dl className="contact-info">
                {product.clientName ? (
                  <>
                    <dt>客户</dt>
                    <dd>{product.clientName}</dd>
                  </>
                ) : null}
                {product.industry ? (
                  <>
                    <dt>行业</dt>
                    <dd>{product.industry}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          ) : null}

          <div className="rich-content" dangerouslySetInnerHTML={{ __html: renderRichText(product.body) }} />
        </div>
      </article>
    </>
  )
}

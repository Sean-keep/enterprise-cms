import Link from 'next/link'
import { renderRichText } from '@/lib/sanitize'
import { ContactFormClient } from '@/components/site/ContactForm'
import type {
  AboutContent,
  ContactContent,
  GenericContent,
  HomeContent,
  PageDto,
  PostDto,
  ProductDto,
} from '@cms/shared'

/**
 * 页面模板。
 *
 * `template` 决定用哪个渲染器 —— 和后台表单、zod schema 三方对齐。
 * 加新版式 = 加一个渲染器 + 后台表单 + shared 里的 schema，**不动数据库**。
 *
 * 这里渲染的全部是固定槽位，没有自由排版的空间。这不是限制，
 * 是「运营改内容、开发改版式」的分工线。
 */

type TemplateProps = {
  page: PageDto
  /** 首页要展示最新内容；只有 home 模板用得上 */
  preview?: { posts: PostDto[]; products: ProductDto[] }
}

export function PageTemplate({ page, preview }: TemplateProps) {
  switch (page.template) {
    case 'home':
      return <HomeTemplate page={page} content={page.content as unknown as HomeContent} preview={preview} />
    case 'about':
      return <AboutTemplate page={page} content={page.content as unknown as AboutContent} />
    case 'contact':
      return <ContactTemplate page={page} content={page.content as unknown as ContactContent} />
    default:
      return <GenericTemplate page={page} content={page.content as unknown as GenericContent} />
  }
}

// ── 首页 ──────────────────────────────────────────────

function HomeTemplate({
  page,
  content,
  preview,
}: TemplateProps & { content: HomeContent }) {
  const hero = content.hero ?? {}
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>{hero.title || page.title}</h1>
          {hero.subtitle ? <p className="lead">{hero.subtitle}</p> : null}
          {(hero.ctaText || hero.cta2Text) && (
            <div className="hero-cta">
              {hero.ctaText ? (
                <Link href={hero.ctaUrl || '/'} className="btn btn-primary">
                  {hero.ctaText}
                </Link>
              ) : null}
              {hero.cta2Text ? (
                <Link href={hero.cta2Url || '/'} className="btn">
                  {hero.cta2Text}
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {content.introHtml ? (
        <section className="section">
          <div className="container-narrow">
            <div className="rich-content" dangerouslySetInnerHTML={{ __html: renderRichText(content.introHtml) }} />
          </div>
        </section>
      ) : null}

      {content.features?.length ? (
        <section className="section section-alt">
          <div className="container">
            <div className="grid-3">
              {content.features.map((f, i) => (
                <div className="feature-card" key={i}>
                  {f.icon ? <div className="feature-icon">{f.icon.slice(0, 1)}</div> : null}
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {content.showProducts && preview?.products?.length ? (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>产品与服务</h2>
            </div>
            <div className="grid-3">
              {preview.products.slice(0, content.productLimit ?? 6).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-24">
              <Link href="/products" className="btn">
                查看全部
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {content.showNews && preview?.posts?.length ? (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <h2>新闻动态</h2>
            </div>
            <div className="grid-3">
              {preview.posts.slice(0, content.newsLimit ?? 6).map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
            <div className="mt-24">
              <Link href="/news" className="btn">
                查看全部
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {content.partners?.length ? (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>{content.partnersTitle || '合作伙伴'}</h2>
            </div>
            <div className="grid-4">
              {content.partners.map((p, i) => (
                <div className="feature-card" key={i} style={{ textAlign: 'center' }}>
                  <h3 style={{ marginBottom: 4 }}>{p.name}</h3>
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-link">
                      了解详情
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}

// ── 关于我们 ──────────────────────────────────────────

function AboutTemplate({ page, content }: TemplateProps & { content: AboutContent }) {
  const hero = content.hero ?? {}
  return (
    <>
      <section className="page-title-band">
        <div className="container">
          <h1>{hero.title || page.title}</h1>
          {hero.subtitle ? <p className="lead">{hero.subtitle}</p> : null}
        </div>
      </section>

      {content.introHtml ? (
        <section className="section">
          <div className="container-narrow">
            <div className="rich-content" dangerouslySetInnerHTML={{ __html: renderRichText(content.introHtml) }} />
          </div>
        </section>
      ) : null}

      {content.stats?.length ? (
        <section className="section section-alt">
          <div className="container">
            <div className={`grid-${Math.min(content.stats.length, 4)}`}>
              {content.stats.map((s, i) => (
                <div className="stat" key={i}>
                  <div className="num">{s.value}</div>
                  <div className="label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {content.storyHtml ? (
        <section className="section">
          <div className="container-narrow">
            <div className="section-head">
              <h2>我们的故事</h2>
            </div>
            <div className="rich-content" dangerouslySetInnerHTML={{ __html: renderRichText(content.storyHtml) }} />
          </div>
        </section>
      ) : null}

      {content.values?.length ? (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <h2>我们的价值观</h2>
            </div>
            <div className={`grid-${Math.min(content.values.length, 3)}`}>
              {content.values.map((v, i) => (
                <div className="feature-card" key={i}>
                  <h3>{v.title}</h3>
                  <p>{v.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {content.timeline?.length ? (
        <section className="section">
          <div className="container-narrow">
            <div className="section-head">
              <h2>发展历程</h2>
            </div>
            <div className="timeline">
              {content.timeline.map((t, i) => (
                <div className="timeline-item" key={i}>
                  <div className="timeline-year">{t.year}</div>
                  <h4>{t.title}</h4>
                  {t.description ? <p>{t.description}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}

// ── 联系我们 ──────────────────────────────────────────

function ContactTemplate({ page, content }: TemplateProps & { content: ContactContent }) {
  const hero = content.hero ?? {}
  return (
    <>
      <section className="page-title-band">
        <div className="container">
          <h1>{hero.title || page.title}</h1>
          {hero.subtitle ? <p className="lead">{hero.subtitle}</p> : null}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-2">
            <div>
              <div className="card">
                <h3 className="card-title">联系方式</h3>
                <dl className="contact-info">
                  {content.email ? (
                    <>
                      <dt>邮箱</dt>
                      <dd>
                        <a href={`mailto:${content.email}`}>{content.email}</a>
                      </dd>
                    </>
                  ) : null}
                  {content.phone ? (
                    <>
                      <dt>电话</dt>
                      <dd>
                        <a href={`tel:${content.phone}`}>{content.phone}</a>
                      </dd>
                    </>
                  ) : null}
                  {content.address ? (
                    <>
                      <dt>地址</dt>
                      <dd>{content.address}</dd>
                    </>
                  ) : null}
                  {content.hours ? (
                    <>
                      <dt>工作时间</dt>
                      <dd>{content.hours}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            </div>

            <div>
              {content.showForm ? (
                <div className="card">
                  <h3 className="card-title">给我们留言</h3>
                  {content.formIntro ? <p className="muted">{content.formIntro}</p> : null}
                  <ContactFormClient successMessage={content.successMessage} />
                </div>
              ) : null}
            </div>
          </div>

          {content.mapEmbedUrl ? (
            <div className="mt-24">
              <iframe
                src={content.mapEmbedUrl}
                style={{ width: '100%', height: 360, border: 0, borderRadius: 10 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="地图"
              />
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}

// ── 自定义页 ──────────────────────────────────────────

function GenericTemplate({ page, content }: TemplateProps & { content: GenericContent }) {
  return (
    <>
      <section className="page-title-band">
        <div className="container">
          <h1>{page.title}</h1>
          {page.summary ? <p className="lead">{page.summary}</p> : null}
        </div>
      </section>
      {content.bodyHtml ? (
        <section className="section">
          <div className="container-narrow">
            <div className="rich-content" dangerouslySetInnerHTML={{ __html: renderRichText(content.bodyHtml) }} />
          </div>
        </section>
      ) : (
        <section className="section">
          <div className="container-narrow empty">这个页面还没有内容。</div>
        </section>
      )}
    </>
  )
}

// ── 列表卡片（首页预览和列表页共用）──────────────────

export function PostCard({ post }: { post: PostDto }) {
  return (
    <Link href={`/news/${post.slug}`} className="post-card" style={{ display: 'block' }}>
      <h3>{post.title}</h3>
      <p>{post.summary || '阅读全文 →'}</p>
      {post.publishedAt ? (
        <p className="muted mt-8" style={{ fontSize: 12.5, marginBottom: 0 }}>
          {new Date(post.publishedAt).toLocaleDateString('zh-CN')}
        </p>
      ) : null}
    </Link>
  )
}

export function ProductCard({ product }: { product: ProductDto }) {
  return (
    <Link href={`/products/${product.slug}`} className="product-card" style={{ display: 'block' }}>
      <h3>{product.title}</h3>
      {product.subtitle ? <p className="muted" style={{ fontSize: 13 }}>{product.subtitle}</p> : null}
      <p>{product.summary || '了解详情 →'}</p>
      {product.highlights?.length ? (
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--fg-soft)', fontSize: 13 }}>
          {product.highlights.slice(0, 2).map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      ) : null}
    </Link>
  )
}

import type { Metadata } from 'next'
import type { PageDto, PostDto, ProductDto, SiteSettings } from '@cms/shared'

/**
 * metadata 组装。fallback 链统一在这里，别在每个页面各写一套 ——
 * 会写出「有的页面有 OG、有的没有」这种不一致。
 *
 *   title       : meta.title → 实体 title → 站点名
 *   description : meta.description → summary → 站点 tagline
 *   og:image    : meta.ogImage → cover → 站点默认 OG
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:8890').replace(/\/$/, '')

function absolute(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

function imageUrl(id: string | null | undefined): string | undefined {
  // 媒体 URL 由后端提供。这里只知道 id 时无法反查 —— 交由各页面把 cover 传进来
  return id ? absolute(`/uploads/${id}`) : undefined
}

type SeoInput = {
  title: string
  description?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  ogImageId?: string | null
  coverUrl?: string | null
  canonicalUrl?: string | null
  path: string
  type?: 'website' | 'article'
}

export function buildMetadataFrom(input: SeoInput): Metadata {
  const title = input.metaTitle?.trim() || input.title
  const description =
    input.metaDescription?.trim() || input.description?.trim() || '企业官方网站'
  const canonical = input.canonicalUrl?.trim() || absolute(input.path)
  const ogImage = input.coverUrl || imageUrl(input.ogImageId)

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: '企业官网',
      type: input.type ?? 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export function buildMetadata(page: PageDto): Metadata {
  return buildMetadataFrom({
    title: page.title,
    description: page.summary,
    metaTitle: page.meta.title,
    metaDescription: page.meta.description,
    ogImageId: page.meta.ogImageId,
    canonicalUrl: page.meta.canonicalUrl,
    path: page.slug === 'home' ? '/' : `/${page.slug}`,
  })
}

export function buildPostMetadata(post: PostDto): Metadata {
  return buildMetadataFrom({
    title: post.title,
    description: post.summary,
    metaTitle: post.meta.title,
    metaDescription: post.meta.description,
    ogImageId: post.meta.ogImageId,
    coverUrl: post.coverMediaId ? null : null,
    canonicalUrl: post.meta.canonicalUrl,
    path: `/news/${post.slug}`,
    type: 'article',
  })
}

export function buildProductMetadata(product: ProductDto): Metadata {
  return buildMetadataFrom({
    title: product.title,
    description: product.summary,
    metaTitle: product.meta.title,
    metaDescription: product.meta.description,
    ogImageId: product.meta.ogImageId,
    canonicalUrl: product.meta.canonicalUrl,
    path: `/products/${product.slug}`,
  })
}

export function siteMetadataFallback(settings: SiteSettings | null | undefined): Metadata {
  return buildMetadataFrom({
    title: settings?.siteName || '企业官网',
    description: settings?.tagline,
    path: '/',
  })
}

import { config } from '../config'

/**
 * on-demand revalidate —— 内容改完后让官网缓存失效。
 *
 * 这不是优化项，是正确性要求。SSG/ISR 页面构建后是静态的，
 * 漏掉这里就会出现「后台改了，官网不更新」。
 *
 * tag 清单集中在下面几个函数里，**不要在 service 里散着打 HTTP**。
 */

export const TAGS = {
  page: (slug: string) => `page:${slug}`,
  pages: 'pages',
  posts: 'posts',
  post: (slug: string) => `post:${slug}`,
  products: 'products',
  product: (slug: string) => `product:${slug}`,
  productCategories: 'product-categories',
  postCategories: 'post-categories',
  site: 'site',
  menus: 'menus',
  sitemap: 'sitemap',
} as const

export type RevalidateTarget = { tags?: string[]; paths?: string[] }

/** 打不到 web 时不能把写操作带崩 —— 记日志，人工兜底有 /api/admin/revalidate */
async function fire(payload: RevalidateTarget): Promise<void> {
  const url = `${config.WEB_BASE_URL.replace(/\/$/, '')}/api/revalidate`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': config.REVALIDATE_SECRET,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.warn(`[revalidate] web 返回 ${res.status}: ${await res.text().catch(() => '')}`)
    }
  } catch (err) {
    console.warn(`[revalidate] 调用失败 ${url}:`, (err as Error).message)
  }
}

export function revalidatePage(slug: string, paths: string[] = []) {
  return fire({
    tags: [TAGS.page(slug), TAGS.pages, TAGS.menus, TAGS.sitemap],
    paths: [`/${slug}`, ...paths],
  })
}

export function revalidateHome() {
  return fire({ tags: [TAGS.page(''), TAGS.pages, TAGS.posts, TAGS.products, TAGS.site, TAGS.menus], paths: ['/'] })
}

export function revalidatePost(slug: string, oldSlug?: string) {
  const paths = [`/news/${slug}`]
  if (oldSlug && oldSlug !== slug) paths.push(`/news/${oldSlug}`)
  return fire({ tags: [TAGS.post(slug), TAGS.posts, TAGS.sitemap], paths: ['/news', ...paths] })
}

export function revalidatePosts() {
  return fire({ tags: [TAGS.posts, TAGS.sitemap], paths: ['/news'] })
}

export function revalidateProduct(slug: string, oldSlug?: string) {
  const paths = [`/products/${slug}`]
  if (oldSlug && oldSlug !== slug) paths.push(`/products/${oldSlug}`)
  return fire({ tags: [TAGS.product(slug), TAGS.products, TAGS.sitemap], paths: ['/products', ...paths] })
}

export function revalidateProducts() {
  return fire({ tags: [TAGS.products, TAGS.sitemap], paths: ['/products'] })
}

/** 菜单和站点配置挂在所有公开页的 layout 上，改动要整站刷。 */
export function revalidateSite() {
  return fire({
    tags: [TAGS.site, TAGS.menus, TAGS.sitemap],
    paths: ['/', '/about', '/contact', '/news', '/products'],
  })
}

export function revalidateAll() {
  return fire({
    tags: Object.values(TAGS).flatMap((t) => (typeof t === 'function' ? [] : [t])),
    paths: ['/', '/news', '/products', '/sitemap.xml'],
  })
}

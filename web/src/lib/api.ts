import 'server-only'

/**
 * 后端 API 客户端（服务端用）。
 *
 * 这里是 web 与 backend 的唯一通道 —— web **不碰数据库**，
 * 只走 HTTP。这样后端可以独立部署、独立扩缩容，也是「前后端」的边界。
 *
 * 缓存与 revalidate 的衔接全在这里：
 *   公开读传 `tags` → fetch 缓存按 tag 失效 → 后端写完打 webhook 刷 tag。
 * 漏传 tags 的页面永远不会随内容更新，所以**公开读必须传 tags**。
 */

const BASE = (process.env.API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '')

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

type FetchOpts = {
  /** revalidateTag 的失效单位。公开读必传。 */
  tags?: string[]
  /** 覆盖缓存秒数；不传则走 Next 默认（公开读会进数据缓存） */
  revalidate?: number | false
  cache?: RequestCache
  headers?: Record<string, string>
  signal?: AbortSignal
}

export async function apiFetch<T>(path: string, init: RequestInit & FetchOpts = {}): Promise<T> {
  const { tags, revalidate, cache, headers, ...rest } = init

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: { accept: 'application/json', ...headers },
      ...(tags?.length
        ? { next: { tags, ...(revalidate !== undefined ? { revalidate } : {}) } }
        : cache
          ? { cache }
          : {}),
    })
  } catch (err) {
    // 后端没起来时，页面不该整个 500 —— 让调用方决定怎么兜
    throw new ApiRequestError(0, 'NETWORK_ERROR', `无法连接后端：${(err as Error).message}`)
  }

  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    throw new ApiRequestError(res.status, 'BAD_RESPONSE', '后端返回了非 JSON 内容')
  }

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } })?.error
    throw new ApiRequestError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `请求失败 (${res.status})`)
  }

  return (body as { data: T }).data
}

// ── 公开读 ────────────────────────────────────────────

export const publicApi = {
  site: (tags: string[] = ['site', 'menus']) =>
    apiFetch<{
      settings: import('@cms/shared').SiteSettings
      menus: { key: string; name: string; items: (import('@cms/shared').MenuItemDto & { href: string })[] }[]
    }>('/api/public/site', { tags }),

  page: (slug: string) =>
    apiFetch<import('@cms/shared').PageDto>(`/api/public/pages/${encodeURIComponent(slug)}`, {
      tags: [`page:${slug}`, 'pages'],
    }),

  posts: (query: Record<string, string | number | undefined> = {}) =>
    apiFetch<{ items: import('@cms/shared').PostDto[]; total: number; page: number; pageSize: number }>(
      `/api/public/posts?${toQuery(query)}`,
      { tags: ['posts'] },
    ),

  post: (slug: string) =>
    apiFetch<import('@cms/shared').PostDto>(`/api/public/posts/${encodeURIComponent(slug)}`, {
      tags: [`post:${slug}`, 'posts'],
    }),

  postCategories: () =>
    apiFetch<import('@cms/shared').PostCategoryDto[]>('/api/public/post-categories', {
      tags: ['post-categories', 'posts'],
    }),

  products: (query: Record<string, string | number | undefined> = {}) =>
    apiFetch<{ items: import('@cms/shared').ProductDto[]; total: number; page: number; pageSize: number }>(
      `/api/public/products?${toQuery(query)}`,
      { tags: ['products'] },
    ),

  product: (slug: string) =>
    apiFetch<import('@cms/shared').ProductDto>(`/api/public/products/${encodeURIComponent(slug)}`, {
      tags: [`product:${slug}`, 'products'],
    }),

  productCategories: () =>
    apiFetch<import('@cms/shared').ProductCategoryDto[]>('/api/public/product-categories', {
      tags: ['product-categories', 'products'],
    }),
}

function toQuery(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  return params.toString()
}

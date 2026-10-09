import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as pages from '../services/pages'
import * as posts from '../services/posts'
import * as products from '../services/products'
import * as menus from '../services/menus'
import * as settings from '../services/settings'
import * as form from '../services/form'
import { ok, paged, badRequest } from '../lib/http'
import { contactSubmit, paginationQuery } from '@cms/shared'

/**
 * 公开读接口。
 *
 * 两个用途：官网 Server Components 走 service 直读（少一跳），以及给
 * 未来的小程序 / App 提供稳定的内容 API。所以接口要真能用，不是摆设。
 *
 * 铁律：**这里只返回 published**。draft 泄露是这个项目最贵的事故。
 */

/** 联系表单限流：同一 IP 10 分钟内最多 5 条。内存实现够骨架用，多实例再换 Redis。 */
const rateBuckets = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 10 * 60 * 1000

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  bucket.count += 1
  return bucket.count <= RATE_LIMIT
}

export async function publicRoutes(app: FastifyInstance) {
  app.get('/api/health', async (request, reply) =>
    ok(reply, { status: 'ok', ts: new Date().toISOString() }),
  )

  // 站点配置 + 全部菜单。首页/布局只打这一个请求。
  app.get('/api/public/site', async (request, reply) => {
    const [site, allMenus] = await Promise.all([settings.getSettings(), menus.listMenus()])
    const resolved = await Promise.all(
      allMenus.map(async (m) => ({
        key: m.key,
        name: m.name,
        items: await menus.resolveMenuHrefs(m.items),
      })),
    )
    return ok(reply, { settings: site, menus: resolved })
  })

  app.get('/api/public/pages/:slug', async (request, reply) => {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(request.params)
    const page = await pages.getPageBySlug(slug, { publicOnly: true })
    return ok(reply, page)
  })

  app.get('/api/public/posts', async (request, reply) => {
    const q = paginationQuery
      .extend({
        categorySlug: z.string().max(100).optional(),
        featured: z.coerce.boolean().optional(),
      })
      .parse(request.query)
    const result = await posts.listPosts({ ...q, categorySlug: q.categorySlug, publicOnly: true })
    return paged(reply, result.items, result.total, q.page, q.pageSize)
  })

  app.get('/api/public/posts/:slug', async (request, reply) => {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(request.params)
    const post = await posts.getPostBySlug(slug, { publicOnly: true })
    return ok(reply, post)
  })

  app.get('/api/public/post-categories', async (request, reply) => ok(reply, await posts.listPostCategories()))

  app.get('/api/public/products', async (request, reply) => {
    const q = paginationQuery
      .extend({
        kind: z.enum(['product', 'service', 'case']).optional(),
        categorySlug: z.string().max(100).optional(),
        featured: z.coerce.boolean().optional(),
      })
      .parse(request.query)
    const result = await products.listProducts({ ...q, publicOnly: true })
    return paged(reply, result.items, result.total, q.page, q.pageSize)
  })

  app.get('/api/public/products/:slug', async (request, reply) => {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(request.params)
    return ok(reply, await products.getProductBySlug(slug, { publicOnly: true }))
  })

  app.get('/api/public/product-categories', async (request, reply) => ok(reply, await products.listProductCategories()))

  // 公开写：唯一的写入口，必须限流
  app.post('/api/public/contact', async (request, reply) => {
    const ip = request.ip || 'unknown'
    if (!rateLimit(ip)) {
      throw badRequest('提交过于频繁，请稍后再试')
    }
    const input = contactSubmit.parse(request.body)
    await form.submitContact(input, { ip, userAgent: request.headers['user-agent'] })
    // 成功响应刻意不带任何「是否已存在」的线索 —— 这是公开接口
    return reply.status(201).send({ data: { ok: true } })
  })
}

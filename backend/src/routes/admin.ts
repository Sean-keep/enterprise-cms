import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as auth from '../services/auth'
import * as pages from '../services/pages'
import * as posts from '../services/posts'
import * as products from '../services/products'
import * as menus from '../services/menus'
import * as media from '../services/media'
import * as settings from '../services/settings'
import * as form from '../services/form'
import {
  requireAuth,
  requireRole,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  pruneSessions,
} from '../plugins/auth'
import { ok, paged, badRequest, unauthorized } from '../lib/http'
import * as revalidate from '../lib/revalidate'
import {
  changePasswordSchema,
  loginSchema,
  pageCreateSchema,
  pageListQuery,
  pageUpdateSchema,
  postCategoryCreate,
  postCategoryUpdate,
  postCreate,
  postListQuery,
  postUpdate,
  productCategoryCreate,
  productCategoryUpdate,
  productCreate,
  productListQuery,
  productUpdate,
  menuUpdateSchema,
  formListQuery,
  formSubmissionUpdate,
  siteSettingsUpdate,
  userCreate,
  mediaUpdate,
  paginationQuery,
} from '@cms/shared'

const idParam = z.object({ id: z.string().min(1) })
const slugParam = z.object({ slug: z.string().min(1) })

/**
 * 后台接口。全部要求登录；写操作大多还要 editor 及以上。
 *
 * 每个写操作在**数据写成功之后**打一次 revalidate —— 集中在本文件里，
 * 不散进 service。漏一条就会出现「后台改了官网不更新」。
 */
export async function adminRoutes(app: FastifyInstance) {
  // ── 鉴权 ──────────────────────────────────────────

  app.post('/api/admin/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body)
    const user = await auth.login(input)
    const token = await createSession(user.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] as string | undefined,
    })
    setSessionCookie(reply, token)
    return ok(reply, user)
  })

  app.post('/api/admin/auth/logout', async (request, reply) => {
    await destroySession(request.cookies?.['cms_session'])
    clearSessionCookie(reply)
    return ok(reply, { ok: true })
  })

  app.get('/api/admin/auth/me', async (request, reply) => {
    if (!request.user) throw unauthorized()
    return ok(reply, request.user)
  })

  app.post('/api/admin/auth/password', { preHandler: requireAuth }, async (request, reply) => {
    const input = changePasswordSchema.parse(request.body)
    await auth.changePassword(request.user!.id, input.oldPassword, input.newPassword)
    return ok(reply, { ok: true })
  })

  app.get('/api/admin/users', { preHandler: requireRole('admin') }, async (request, reply) => {
    return ok(reply, await auth.listUsers())
  })

  app.post('/api/admin/users', { preHandler: requireRole('admin') }, async (request, reply) => {
    const input = userCreate.parse(request.body)
    return ok(reply, await auth.createUser(input), 201)
  })

  // ── 页面 ──────────────────────────────────────────

  app.get('/api/admin/pages', { preHandler: requireAuth }, async (request, reply) => {
    const q = pageListQuery.parse(request.query)
    const result = await pages.listPages(q)
    return paged(reply, result.items, result.total, q.page, q.pageSize)
  })

  app.get('/api/admin/pages/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    return ok(reply, await pages.getPageById(id))
  })

  app.post('/api/admin/pages', { preHandler: requireRole('editor') }, async (request, reply) => {
    const input = pageCreateSchema.parse(request.body)
    const created = await pages.createPage(input, request.user!.id)
    await revalidate.revalidatePage(created.slug, created.slug === 'home' ? ['/'] : [])
    return ok(reply, created, 201)
  })

  app.put('/api/admin/pages/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const input = pageUpdateSchema.parse(request.body)
    const before = await pages.getPageById(id)
    const updated = await pages.updatePage(id, input)
    // slug 可能被改 —— 旧路径也要失效，否则旧 URL 一直挂着旧内容
    await revalidate.revalidatePage(updated.slug, [
      ...(before.slug !== updated.slug ? [`/${before.slug}`] : []),
      ...(updated.slug === 'home' ? ['/'] : []),
    ])
    return ok(reply, updated)
  })

  app.delete('/api/admin/pages/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const { slug } = await pages.deletePage(id)
    await revalidate.revalidatePage(slug)
    return ok(reply, { ok: true })
  })

  // ── 新闻 ──────────────────────────────────────────

  app.get('/api/admin/posts', { preHandler: requireAuth }, async (request, reply) => {
    const q = postListQuery.parse(request.query)
    const result = await posts.listPosts(q)
    return paged(reply, result.items, result.total, q.page, q.pageSize)
  })

  app.get('/api/admin/posts/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    return ok(reply, await posts.getPostById(id))
  })

  app.post('/api/admin/posts', { preHandler: requireRole('editor') }, async (request, reply) => {
    const created = await posts.createPost(postCreate.parse(request.body), request.user!.id)
    await revalidate.revalidatePost(created.slug)
    return ok(reply, created, 201)
  })

  app.put('/api/admin/posts/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const before = await posts.getPostById(id)
    const updated = await posts.updatePost(id, postUpdate.parse(request.body), before.slug)
    await revalidate.revalidatePost(updated.slug, before.slug)
    return ok(reply, updated)
  })

  app.delete('/api/admin/posts/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const { slug } = await posts.deletePost(id)
    await revalidate.revalidatePost(slug)
    return ok(reply, { ok: true })
  })

  app.get('/api/admin/post-categories', { preHandler: requireAuth }, async (request, reply) => {
    return ok(reply, await posts.listPostCategories())
  })

  app.post('/api/admin/post-categories', { preHandler: requireRole('editor') }, async (request, reply) => {
    const created = await posts.createPostCategory(postCategoryCreate.parse(request.body))
    await revalidate.revalidatePosts()
    return ok(reply, created, 201)
  })

  app.put('/api/admin/post-categories/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const updated = await posts.updatePostCategory(id, postCategoryUpdate.parse(request.body))
    await revalidate.revalidatePosts()
    return ok(reply, updated)
  })

  app.delete('/api/admin/post-categories/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    await posts.deletePostCategory(id)
    await revalidate.revalidatePosts()
    return ok(reply, { ok: true })
  })

  // ── 产品 / 服务 / 案例 ─────────────────────────────

  app.get('/api/admin/products', { preHandler: requireAuth }, async (request, reply) => {
    const q = productListQuery.parse(request.query)
    const result = await products.listProducts(q)
    return paged(reply, result.items, result.total, q.page, q.pageSize)
  })

  app.get('/api/admin/products/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    return ok(reply, await products.getProductById(id))
  })

  app.post('/api/admin/products', { preHandler: requireRole('editor') }, async (request, reply) => {
    const created = await products.createProduct(productCreate.parse(request.body), request.user!.id)
    await revalidate.revalidateProduct(created.slug)
    return ok(reply, created, 201)
  })

  app.put('/api/admin/products/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const before = await products.getProductById(id)
    const updated = await products.updateProduct(id, productUpdate.parse(request.body))
    await revalidate.revalidateProduct(updated.slug, before.slug)
    return ok(reply, updated)
  })

  app.delete('/api/admin/products/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const { slug } = await products.deleteProduct(id)
    await revalidate.revalidateProduct(slug)
    return ok(reply, { ok: true })
  })

  app.get('/api/admin/product-categories', { preHandler: requireAuth }, async (request, reply) => {
    return ok(reply, await products.listProductCategories())
  })

  app.post('/api/admin/product-categories', { preHandler: requireRole('editor') }, async (request, reply) => {
    const created = await products.createProductCategory(productCategoryCreate.parse(request.body))
    await revalidate.revalidateProducts()
    return ok(reply, created, 201)
  })

  app.put('/api/admin/product-categories/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const updated = await products.updateProductCategory(id, productCategoryUpdate.parse(request.body))
    await revalidate.revalidateProducts()
    return ok(reply, updated)
  })

  app.delete('/api/admin/product-categories/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    await products.deleteProductCategory(id)
    await revalidate.revalidateProducts()
    return ok(reply, { ok: true })
  })

  // ── 菜单 ──────────────────────────────────────────

  app.get('/api/admin/menus', { preHandler: requireAuth }, async (request, reply) => {
    return ok(reply, await menus.listMenus())
  })

  app.put('/api/admin/menus/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const updated = await menus.updateMenu(id, menuUpdateSchema.parse(request.body))
    await revalidate.revalidateSite()
    return ok(reply, updated)
  })

  // ── 媒体 ──────────────────────────────────────────

  app.get('/api/admin/media', { preHandler: requireAuth }, async (request, reply) => {
    const q = paginationQuery.parse(request.query)
    const result = await media.listMedia(q.page, q.pageSize)
    return paged(reply, result.items, result.total, q.page, q.pageSize)
  })

  app.post('/api/admin/media', { preHandler: requireRole('editor') }, async (request, reply) => {
    const file = await request.file()
    if (!file) throw badRequest('缺少文件')
    const data = await file.toBuffer()
    const created = await media.saveUpload({
      filename: file.filename,
      mime: file.mimetype,
      data,
      uploadedBy: request.user!.id,
    })
    return ok(reply, created, 201)
  })

  app.put('/api/admin/media/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    return ok(reply, await media.updateMedia(id, mediaUpdate.parse(request.body)))
  })

  app.delete('/api/admin/media/:id', { preHandler: requireRole('editor') }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    await media.deleteMedia(id)
    return ok(reply, { ok: true })
  })

  // ── 站点配置 ──────────────────────────────────────

  app.get('/api/admin/settings', { preHandler: requireAuth }, async (request, reply) => {
    return ok(reply, await settings.getSettings())
  })

  app.put('/api/admin/settings', { preHandler: requireRole('admin') }, async (request, reply) => {
    const updated = await settings.updateSettings(siteSettingsUpdate.parse(request.body))
    await revalidate.revalidateSite()
    return ok(reply, updated)
  })

  // ── 表单收集 ──────────────────────────────────────

  app.get('/api/admin/forms', { preHandler: requireAuth }, async (request, reply) => {
    const q = formListQuery.parse(request.query)
    const result = await form.listSubmissions(q)
    return paged(reply, result.items, result.total, q.page, q.pageSize)
  })

  app.get('/api/admin/forms/stats', { preHandler: requireAuth }, async (request, reply) => {
    return ok(reply, await form.submissionStats())
  })

  app.patch('/api/admin/forms/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    return ok(reply, await form.updateSubmission(id, formSubmissionUpdate.parse(request.body)))
  })

  // ── 缓存兜底 ──────────────────────────────────────
  // 运营说「官网没更新」时用这个手动刷。不是常规流程，是逃生门。
  app.post('/api/admin/revalidate', { preHandler: requireRole('editor') }, async (request, reply) => {
    const input = z
      .object({
        tags: z.array(z.string()).optional(),
        paths: z.array(z.string()).optional(),
        all: z.boolean().optional(),
      })
      .parse(request.body ?? {})
    if (input.all || (!input.tags?.length && !input.paths?.length)) {
      await revalidate.revalidateAll()
    } else {
      await revalidate.revalidateSite()
    }
    return ok(reply, { ok: true })
  })

  // 定期清过期会话，避免 sessions 表无限长
  app.addHook('onReady', async () => {
    setInterval(() => pruneSessions().catch(() => {}), 60 * 60 * 1000).unref()
  })
}

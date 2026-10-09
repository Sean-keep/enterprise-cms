import { db } from '../db'
import { parseJson, stringifyJson } from '../lib/json'
import { sanitizeRichText, sanitizePlain } from '../lib/sanitize'
import { notFound, badRequest } from '../lib/http'
import { publishedScope, pagination, likeTerm } from './scope'
import { emptyMeta, metaSchema, type PostCreate, type PostDto, type PostUpdate } from '@cms/shared'

/**
 * 新闻。要查询/筛选/分页/按时间倒序 —— 所以是真实列，不是 JSON。
 * 跟 pages 的分界线就在这里。
 */

type PostRow = {
  id: string
  slug: string
  title: string
  summary: string | null
  body: string
  coverMediaId: string | null
  categoryId: string | null
  status: string
  isFeatured: boolean
  viewCount: number
  meta: string
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  category?: { id: string; slug: string; name: string; description: string | null; sortOrder: number } | null
}

function toDto(row: PostRow): PostDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    coverMediaId: row.coverMediaId,
    categoryId: row.categoryId,
    category: row.category
      ? {
          id: row.category.id,
          slug: row.category.slug,
          name: row.category.name,
          description: row.category.description,
          sortOrder: row.category.sortOrder,
        }
      : null,
    status: row.status as PostDto['status'],
    isFeatured: row.isFeatured,
    viewCount: row.viewCount,
    meta: metaSchema.parse(parseJson(row.meta, emptyMeta)),
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listPosts(query: {
  q?: string
  status?: string
  categoryId?: string
  categorySlug?: string
  featured?: boolean
  page: number
  pageSize: number
  publicOnly?: boolean
}) {
  const term = likeTerm(query.q)
  const where = {
    ...(query.publicOnly ? publishedScope : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.categorySlug ? { category: { slug: query.categorySlug } } : {}),
    ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
    ...(term
      ? {
          OR: [
            { title: { contains: term } },
            { summary: { contains: term } },
            { slug: { contains: term } },
          ],
        }
      : {}),
  }
  const [total, rows] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({
      where,
      include: { category: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      ...pagination(query.page, query.pageSize),
    }),
  ])
  return { items: rows.map(toDto), total }
}

export async function getPostById(id: string): Promise<PostDto> {
  const row = await db.post.findUnique({ where: { id }, include: { category: true } })
  if (!row) throw notFound('新闻')
  return toDto(row)
}

export async function getPostBySlug(slug: string, opts: { publicOnly?: boolean } = {}): Promise<PostDto> {
  const row = await db.post.findFirst({
    where: opts.publicOnly ? { slug, ...publishedScope } : { slug },
    include: { category: true },
  })
  if (!row) throw notFound('新闻')
  return toDto(row)
}

/** 阅读数。单独一个函数，别混进查询 —— 查询是只读的，不该有副作用。 */
export async function bumpViewCount(id: string): Promise<void> {
  await db.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})
}

export async function createPost(input: PostCreate, createdBy: string): Promise<PostDto> {
  if (await db.post.findUnique({ where: { slug: input.slug } })) {
    throw badRequest(`slug「${input.slug}」已被占用`)
  }
  const row = await db.post.create({
    data: {
      slug: input.slug,
      title: sanitizePlain(input.title),
      summary: input.summary ? sanitizePlain(input.summary) : null,
      body: sanitizeRichText(input.body ?? ''),
      coverMediaId: input.coverMediaId ?? null,
      categoryId: input.categoryId ?? null,
      status: input.status ?? 'draft',
      isFeatured: input.isFeatured ?? false,
      meta: stringifyJson(metaSchema.parse(input.meta ?? {})),
      publishedAt: input.publishedAt ?? (input.status === 'published' ? new Date() : null),
      createdBy,
    },
    include: { category: true },
  })
  return toDto(row)
}

export async function updatePost(id: string, input: PostUpdate, oldSlug?: string): Promise<PostDto> {
  const current = await db.post.findUnique({ where: { id } })
  if (!current) throw notFound('新闻')
  if (input.slug && input.slug !== current.slug) {
    if (await db.post.findUnique({ where: { slug: input.slug } })) {
      throw badRequest(`slug「${input.slug}」已被占用`)
    }
  }
  const row = await db.post.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.title !== undefined ? { title: sanitizePlain(input.title) } : {}),
      ...(input.summary !== undefined
        ? { summary: input.summary ? sanitizePlain(input.summary) : null }
        : {}),
      ...(input.body !== undefined ? { body: sanitizeRichText(input.body) } : {}),
      ...(input.coverMediaId !== undefined ? { coverMediaId: input.coverMediaId } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.meta !== undefined ? { meta: stringifyJson(metaSchema.parse(input.meta)) } : {}),
      ...(input.publishedAt !== undefined
        ? { publishedAt: input.publishedAt }
        : input.status === 'published' && !current.publishedAt
          ? { publishedAt: new Date() }
          : {}),
    },
    include: { category: true },
  })
  return toDto(row)
}

export async function deletePost(id: string): Promise<{ slug: string }> {
  const row = await db.post.findUnique({ where: { id } })
  if (!row) throw notFound('新闻')
  await db.post.delete({ where: { id } })
  return { slug: row.slug }
}

// ── 分类 ──────────────────────────────────────────────

export async function listPostCategories() {
  const rows = await db.postCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { posts: true } } },
  })
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    sortOrder: r.sortOrder,
    postCount: r._count.posts,
  }))
}

export async function createPostCategory(input: { slug: string; name: string; description?: string | null; sortOrder?: number }) {
  return db.postCategory.create({
    data: {
      slug: input.slug,
      name: sanitizePlain(input.name),
      description: input.description ? sanitizePlain(input.description) : null,
      sortOrder: input.sortOrder ?? 0,
    },
  })
}

export async function updatePostCategory(id: string, input: Partial<{ slug: string; name: string; description: string | null; sortOrder: number }>) {
  return db.postCategory.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.name !== undefined ? { name: sanitizePlain(input.name) } : {}),
      ...(input.description !== undefined
        ? { description: input.description ? sanitizePlain(input.description) : null }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  })
}

export async function deletePostCategory(id: string): Promise<void> {
  // 分类下的新闻降级为「无分类」，不跟着删 —— 删个分类不该让一批文章消失
  await db.$transaction([
    db.post.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
    db.postCategory.delete({ where: { id } }),
  ])
}

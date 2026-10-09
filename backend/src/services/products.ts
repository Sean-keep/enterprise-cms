import { db } from '../db'
import { parseJson, stringifyJson } from '../lib/json'
import { sanitizeRichText, sanitizePlain } from '../lib/sanitize'
import { notFound, badRequest } from '../lib/http'
import { publishedScope, pagination, likeTerm } from './scope'
import { emptyMeta, metaSchema, type ProductCreate, type ProductDto, type ProductUpdate } from '@cms/shared'

/**
 * 产品 / 服务 / 案例。三者一张表，靠 kind 区分。
 * 字段高度重合，拆三张表只会把列表页、导航、后台做成三份。
 */

type ProductRow = {
  id: string
  slug: string
  kind: string
  title: string
  subtitle: string | null
  summary: string | null
  body: string
  coverMediaId: string | null
  categoryId: string | null
  isFeatured: boolean
  sortOrder: number
  highlights: string
  clientName: string | null
  industry: string | null
  status: string
  meta: string
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  category?: { id: string; slug: string; name: string; description: string | null; sortOrder: number } | null
}

function toDto(row: ProductRow): ProductDto {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind as ProductDto['kind'],
    title: row.title,
    subtitle: row.subtitle,
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
    isFeatured: row.isFeatured,
    sortOrder: row.sortOrder,
    highlights: parseJson<string[]>(row.highlights, []),
    clientName: row.clientName,
    industry: row.industry,
    status: row.status as ProductDto['status'],
    meta: metaSchema.parse(parseJson(row.meta, emptyMeta)),
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listProducts(query: {
  q?: string
  kind?: string
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
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.categorySlug ? { category: { slug: query.categorySlug } } : {}),
    ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
    ...(term
      ? {
          OR: [
            { title: { contains: term } },
            { summary: { contains: term } },
            { subtitle: { contains: term } },
            { slug: { contains: term } },
          ],
        }
      : {}),
  }
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: { category: true },
      // 产品页看的是「推荐顺序」，不是时间序 —— 排序权在运营手里
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      ...pagination(query.page, query.pageSize),
    }),
  ])
  return { items: rows.map(toDto), total }
}

export async function getProductById(id: string): Promise<ProductDto> {
  const row = await db.product.findUnique({ where: { id }, include: { category: true } })
  if (!row) throw notFound('内容')
  return toDto(row)
}

export async function getProductBySlug(slug: string, opts: { publicOnly?: boolean } = {}): Promise<ProductDto> {
  const row = await db.product.findFirst({
    where: opts.publicOnly ? { slug, ...publishedScope } : { slug },
    include: { category: true },
  })
  if (!row) throw notFound('内容')
  return toDto(row)
}

export async function createProduct(input: ProductCreate, createdBy: string): Promise<ProductDto> {
  if (await db.product.findUnique({ where: { slug: input.slug } })) {
    throw badRequest(`slug「${input.slug}」已被占用`)
  }
  const row = await db.product.create({
    data: {
      slug: input.slug,
      kind: input.kind ?? 'product',
      title: sanitizePlain(input.title),
      subtitle: input.subtitle ? sanitizePlain(input.subtitle) : null,
      summary: input.summary ? sanitizePlain(input.summary) : null,
      body: sanitizeRichText(input.body ?? ''),
      coverMediaId: input.coverMediaId ?? null,
      categoryId: input.categoryId ?? null,
      isFeatured: input.isFeatured ?? false,
      sortOrder: input.sortOrder ?? 0,
      highlights: stringifyJson(input.highlights ?? []),
      clientName: input.clientName ? sanitizePlain(input.clientName) : null,
      industry: input.industry ? sanitizePlain(input.industry) : null,
      status: input.status ?? 'draft',
      meta: stringifyJson(metaSchema.parse(input.meta ?? {})),
      publishedAt: input.publishedAt ?? (input.status === 'published' ? new Date() : null),
      createdBy,
    },
    include: { category: true },
  })
  return toDto(row)
}

export async function updateProduct(id: string, input: ProductUpdate): Promise<ProductDto> {
  const current = await db.product.findUnique({ where: { id } })
  if (!current) throw notFound('内容')
  if (input.slug && input.slug !== current.slug) {
    if (await db.product.findUnique({ where: { slug: input.slug } })) {
      throw badRequest(`slug「${input.slug}」已被占用`)
    }
  }
  const row = await db.product.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.title !== undefined ? { title: sanitizePlain(input.title) } : {}),
      ...(input.subtitle !== undefined
        ? { subtitle: input.subtitle ? sanitizePlain(input.subtitle) : null }
        : {}),
      ...(input.summary !== undefined
        ? { summary: input.summary ? sanitizePlain(input.summary) : null }
        : {}),
      ...(input.body !== undefined ? { body: sanitizeRichText(input.body) } : {}),
      ...(input.coverMediaId !== undefined ? { coverMediaId: input.coverMediaId } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.highlights !== undefined ? { highlights: stringifyJson(input.highlights) } : {}),
      ...(input.clientName !== undefined
        ? { clientName: input.clientName ? sanitizePlain(input.clientName) : null }
        : {}),
      ...(input.industry !== undefined
        ? { industry: input.industry ? sanitizePlain(input.industry) : null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
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

export async function deleteProduct(id: string): Promise<{ slug: string }> {
  const row = await db.product.findUnique({ where: { id } })
  if (!row) throw notFound('内容')
  await db.product.delete({ where: { id } })
  return { slug: row.slug }
}

// ── 分类 ──────────────────────────────────────────────

export async function listProductCategories() {
  const rows = await db.productCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  })
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    sortOrder: r.sortOrder,
    productCount: r._count.products,
  }))
}

export async function createProductCategory(input: {
  slug: string
  name: string
  description?: string | null
  sortOrder?: number
}) {
  return db.productCategory.create({
    data: {
      slug: input.slug,
      name: sanitizePlain(input.name),
      description: input.description ? sanitizePlain(input.description) : null,
      sortOrder: input.sortOrder ?? 0,
    },
  })
}

export async function updateProductCategory(
  id: string,
  input: Partial<{ slug: string; name: string; description: string | null; sortOrder: number }>,
) {
  return db.productCategory.update({
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

export async function deleteProductCategory(id: string): Promise<void> {
  await db.$transaction([
    db.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
    db.productCategory.delete({ where: { id } }),
  ])
}

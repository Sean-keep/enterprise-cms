import { db } from '../db'
import { parseJson, stringifyJson } from '../lib/json'
import { sanitizeRichText, sanitizePlain } from '../lib/sanitize'
import { notFound, badRequest } from '../lib/http'
import { publishedScope, pagination, likeTerm } from './scope'
import {
  contentSchemaFor,
  emptyContentFor,
  emptyMeta,
  metaSchema,
  type PageCreate,
  type PageDto,
  type PageTemplate,
  type PageUpdate,
} from '@cms/shared'

/**
 * 页面服务。
 *
 * content 的形状由 template 决定，这里在**入库前**用对应的 zod schema
 * 校验并补默认值 —— 库里存的永远是形状完整的 JSON，前台读出来不用防脏数据。
 */

type PageRow = {
  id: string
  slug: string
  template: string
  title: string
  summary: string | null
  content: string
  meta: string
  status: string
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/** 通用正文字段里的 HTML 也要过清洗 —— content 里可能有 introHtml / bodyHtml */
function scrubHtmlInContent(template: string, content: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...content }
  for (const key of ['introHtml', 'storyHtml', 'bodyHtml', 'html']) {
    if (typeof out[key] === 'string') {
      out[key] = sanitizeRichText(out[key] as string)
    }
  }
  return out
}

function toDto(row: PageRow): PageDto {
  return {
    id: row.id,
    slug: row.slug,
    template: row.template as PageDto['template'],
    title: row.title,
    summary: row.summary,
    status: row.status as PageDto['status'],
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    meta: metaSchema.parse(parseJson(row.meta, emptyMeta)),
    content: parseJson(row.content, {}) as Record<string, unknown>,
  }
}

/** 按 template 校验并规范化 content。这是「模板加字段不用迁移」的落点。 */
function normalizeContent(template: PageTemplate, raw: unknown): string {
  const schema = contentSchemaFor(template)
  const parsed = schema.safeParse(raw ?? {})
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw badRequest(`content.${first.path.join('.')}：${first.message}`)
  }
  return stringifyJson(scrubHtmlInContent(template, parsed.data as Record<string, unknown>))
}

export async function listPages(query: {
  q?: string
  template?: string
  status?: string
  page: number
  pageSize: number
}) {
  const term = likeTerm(query.q)
  const where = {
    ...(query.template ? { template: query.template } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(term
      ? {
          OR: [
            { title: { contains: term } },
            { slug: { contains: term } },
            { summary: { contains: term } },
          ],
        }
      : {}),
  }
  const [total, rows] = await Promise.all([
    db.page.count({ where }),
    db.page.findMany({ where, orderBy: { updatedAt: 'desc' }, ...pagination(query.page, query.pageSize) }),
  ])
  return { items: rows.map(toDto), total }
}

export async function getPageById(id: string): Promise<PageDto> {
  const row = await db.page.findUnique({ where: { id } })
  if (!row) throw notFound('页面')
  return toDto(row)
}

export async function getPageBySlug(slug: string, opts: { publicOnly?: boolean } = {}): Promise<PageDto> {
  const row = await db.page.findFirst({
    where: opts.publicOnly ? { slug, ...publishedScope } : { slug },
  })
  if (!row) throw notFound('页面')
  return toDto(row)
}

export async function createPage(input: PageCreate, createdBy: string): Promise<PageDto> {
  const existing = await db.page.findUnique({ where: { slug: input.slug } })
  if (existing) throw badRequest(`slug「${input.slug}」已被占用`)

  const template = input.template as PageTemplate
  const row = await db.page.create({
    data: {
      slug: input.slug,
      template,
      title: sanitizePlain(input.title),
      summary: input.summary ? sanitizePlain(input.summary) : null,
      content: normalizeContent(template, input.content ?? emptyContentFor(template)),
      meta: stringifyJson(metaSchema.parse(input.meta ?? {})),
      status: input.status ?? 'draft',
      publishedAt: input.publishedAt ?? (input.status === 'published' ? new Date() : null),
      createdBy,
    },
  })
  return toDto(row)
}

export async function updatePage(id: string, input: PageUpdate): Promise<PageDto> {
  const current = await db.page.findUnique({ where: { id } })
  if (!current) throw notFound('页面')

  if (input.slug && input.slug !== current.slug) {
    const clash = await db.page.findUnique({ where: { slug: input.slug } })
    if (clash) throw badRequest(`slug「${input.slug}」已被占用`)
  }

  const template = (input.template ?? current.template) as PageTemplate
  // template 可能被改 —— content 必须按**新**模板重新校验，否则会留下错形状的 JSON
  const content = input.content !== undefined
    ? normalizeContent(template, input.content)
    : normalizeContent(template, parseJson(current.content, emptyContentFor(template)))

  const row = await db.page.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      template,
      ...(input.title !== undefined ? { title: sanitizePlain(input.title) } : {}),
      ...(input.summary !== undefined
        ? { summary: input.summary ? sanitizePlain(input.summary) : null }
        : {}),
      content,
      ...(input.meta !== undefined ? { meta: stringifyJson(metaSchema.parse(input.meta)) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.publishedAt !== undefined
        ? { publishedAt: input.publishedAt }
        : input.status === 'published' && !current.publishedAt
          ? { publishedAt: new Date() }
          : {}),
    },
  })
  return toDto(row)
}

export async function deletePage(id: string): Promise<{ slug: string }> {
  const row = await db.page.findUnique({ where: { id } })
  if (!row) throw notFound('页面')
  await db.page.delete({ where: { id } })
  return { slug: row.slug }
}

/** sitemap 用：只列已发布的 slug。 */
export async function publishedSlugs(): Promise<string[]> {
  const rows = await db.page.findMany({ where: publishedScope, select: { slug: true } })
  return rows.map((r) => r.slug)
}

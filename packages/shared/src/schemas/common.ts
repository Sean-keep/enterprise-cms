import { z } from 'zod'
import {
  CONTENT_STATUSES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../constants'

/**
 * 通用片段。所有内容类型的 schema 都从这里拼，避免各写各的。
 */

/**
 * 可空文本。收三种「没有内容」的写法：键没传、显式 null、空串/纯空白 —— 统一出 null。
 * 必须带 optional：create 时前端不传是常态，否则会报「Required」。
 * update 走 `create.partial()` 时，外层 optional 才能把「不改」(undefined) 和「清空」(null) 分开。
 */
export const nullableText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => {
      if (v === undefined || v === null) return null
      const t = v.trim()
      return t === '' ? null : t
    })

export const text = (max: number) => z.string().max(max).transform((v) => v.trim())

export const html = () => z.string().max(200_000)

/** slug：URL 段。中文标题可以手填英文/拼音，不强制。 */
export const slug = z
  .string()
  .min(1)
  .max(150)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '只能用小写字母、数字和连字符')

export const status = z.enum(CONTENT_STATUSES)

/** ISO 日期时间字符串 → Date。空串/null → null。 */
export const isoDateTime = z
  .union([z.string(), z.date(), z.null()])
  .transform((v) => {
    if (v === null || v === '') return null
    return v instanceof Date ? v : new Date(v)
  })
  .nullable()

export const id = z.string().min(1).max(64)

/** 媒体 id：要么是 id，要么是 null（未选图）。 */
export const mediaId = id.nullable()

/** SEO 块 —— 所有内容类型共用一套。 */
export const metaSchema = z
  .object({
    title: z.string().max(200).default(''),
    description: z.string().max(500).default(''),
    keywords: z.string().max(255).default(''),
    ogImageId: mediaId.default(null),
    canonicalUrl: z.string().max(500).default(''),
  })
  .default({})
export type Meta = z.infer<typeof metaSchema>

export const emptyMeta: Meta = {
  title: '',
  description: '',
  keywords: '',
  ogImageId: null,
  canonicalUrl: '',
}

/** 分页查询。 */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})
export type PaginationQuery = z.infer<typeof paginationQuery>

export function paged<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
}

/** API 统一响应外壳。 */
export function apiData<T extends z.ZodTypeAny>(data: T) {
  return z.object({ data })
}

export const apiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})
export type ApiError = z.infer<typeof apiError>

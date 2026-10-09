import { z } from 'zod'
import {
  html,
  id,
  isoDateTime,
  mediaId,
  metaSchema,
  nullableText,
  paginationQuery,
  slug,
  status,
  text,
} from './common'

/**
 * 新闻 / 公告。要列表、筛选、分页、按时间倒序 —— 这类要查询的内容
 * 用真实列，不进 JSON。这是和 pages 的分界线。
 */

export const postCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
  postCount: z.number().int().optional(),
})
export type PostCategoryDto = z.infer<typeof postCategorySchema>

export const postCategoryCreate = z.object({
  slug,
  name: text(100),
  description: nullableText(500),
  sortOrder: z.number().int().default(0),
})
export const postCategoryUpdate = postCategoryCreate.partial()

export const postDto = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  body: z.string(),
  coverMediaId: z.string().nullable(),
  categoryId: z.string().nullable(),
  category: postCategorySchema.nullable().optional(),
  status,
  isFeatured: z.boolean(),
  viewCount: z.number().int(),
  meta: metaSchema,
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type PostDto = z.infer<typeof postDto>

export const postCreate = z.object({
  slug,
  title: text(200),
  summary: nullableText(500),
  body: html().default(''),
  coverMediaId: mediaId.default(null),
  categoryId: id.nullable().default(null),
  status: status.default('draft'),
  isFeatured: z.boolean().default(false),
  meta: metaSchema.optional(),
  publishedAt: isoDateTime.optional(),
})
export type PostCreate = z.infer<typeof postCreate>

export const postUpdate = postCreate.partial()
export type PostUpdate = z.infer<typeof postUpdate>

export const postListQuery = paginationQuery.extend({
  q: z.string().max(200).optional(),
  status: status.optional(),
  categoryId: id.optional(),
  categorySlug: z.string().max(100).optional(),
  featured: z.coerce.boolean().optional(),
})
export type PostListQuery = z.infer<typeof postListQuery>

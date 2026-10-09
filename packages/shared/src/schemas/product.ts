import { z } from 'zod'
import { PRODUCT_KINDS } from '../constants'
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
 * 产品 / 服务 / 案例。三者共用一张表，靠 kind 区分 ——
 * 字段高度重合，拆三张表只会把列表页和导航做成三份。
 */

export const productCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
  productCount: z.number().int().optional(),
})
export type ProductCategoryDto = z.infer<typeof productCategorySchema>

export const productCategoryCreate = z.object({
  slug,
  name: text(100),
  description: nullableText(500),
  sortOrder: z.number().int().default(0),
})
export const productCategoryUpdate = productCategoryCreate.partial()

/** 结构化卖点。放正文里硬排会让列表页没法展示，所以单列一个数组。 */
export const highlightSchema = z.string().min(1).max(200)

export const productDto = z.object({
  id: z.string(),
  slug: z.string(),
  kind: z.enum(PRODUCT_KINDS),
  title: z.string(),
  subtitle: z.string().nullable(),
  summary: z.string().nullable(),
  body: z.string(),
  coverMediaId: z.string().nullable(),
  categoryId: z.string().nullable(),
  category: productCategorySchema.nullable().optional(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int(),
  highlights: z.array(z.string()),
  clientName: z.string().nullable(),
  industry: z.string().nullable(),
  status,
  meta: metaSchema,
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type ProductDto = z.infer<typeof productDto>

export const productCreate = z.object({
  slug,
  kind: z.enum(PRODUCT_KINDS).default('product'),
  title: text(200),
  subtitle: nullableText(200),
  summary: nullableText(500),
  body: html().default(''),
  coverMediaId: mediaId.default(null),
  categoryId: id.nullable().default(null),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  highlights: z.array(highlightSchema).max(12).default([]),
  clientName: nullableText(100),
  industry: nullableText(100),
  status: status.default('draft'),
  meta: metaSchema.optional(),
  publishedAt: isoDateTime.optional(),
})
export type ProductCreate = z.infer<typeof productCreate>

export const productUpdate = productCreate.partial()
export type ProductUpdate = z.infer<typeof productUpdate>

export const productListQuery = paginationQuery.extend({
  q: z.string().max(200).optional(),
  kind: z.enum(PRODUCT_KINDS).optional(),
  status: status.optional(),
  categoryId: id.optional(),
  categorySlug: z.string().max(100).optional(),
  featured: z.coerce.boolean().optional(),
})
export type ProductListQuery = z.infer<typeof productListQuery>

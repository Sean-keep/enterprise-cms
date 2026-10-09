import { z } from 'zod'
import { PAGE_TEMPLATES, type PageTemplate } from '../constants'
import { html, id, mediaId, metaSchema, nullableText, slug, status, text, isoDateTime } from './common'

/**
 * 页面内容 —— 按 template 分派的类型化 JSON。
 *
 * 这里是「灵活」和「结构化」的交界：
 *   - 运营改的是下面这些**固定槽位**，不能自由排版；
 *   - 开发加一个槽位 = 改这里 + 改后台表单，**不用迁移数据库**。
 * 形状由 zod 锁死，前后端共用同一份定义，两边不可能对不上。
 */

// ── home ──────────────────────────────────────────────
export const heroSchema = z.object({
  title: z.string().max(200).default(''),
  subtitle: z.string().max(500).default(''),
  imageId: mediaId.default(null),
  ctaText: z.string().max(50).default(''),
  ctaUrl: z.string().max(500).default(''),
  cta2Text: z.string().max(50).default(''),
  cta2Url: z.string().max(500).default(''),
})
export type Hero = z.infer<typeof heroSchema>

export const featureSchema = z.object({
  icon: z.string().max(50).default(''),
  title: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
})
export type Feature = z.infer<typeof featureSchema>

export const partnerSchema = z.object({
  name: z.string().min(1).max(100),
  logoMediaId: mediaId.default(null),
  url: z.string().max(500).default(''),
})
export type Partner = z.infer<typeof partnerSchema>

export const homeContentSchema = z.object({
  hero: heroSchema.default({}),
  introHtml: html().default(''),
  features: z.array(featureSchema).max(12).default([]),
  showProducts: z.boolean().default(true),
  productLimit: z.number().int().min(0).max(24).default(6),
  showNews: z.boolean().default(true),
  newsLimit: z.number().int().min(0).max(24).default(6),
  partnersTitle: z.string().max(200).default(''),
  partners: z.array(partnerSchema).max(24).default([]),
})
export type HomeContent = z.infer<typeof homeContentSchema>

// ── about ─────────────────────────────────────────────
export const valueSchema = z.object({
  icon: z.string().max(50).default(''),
  title: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
})
export type AboutValue = z.infer<typeof valueSchema>

export const milestoneSchema = z.object({
  year: z.string().min(1).max(20),
  title: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
})
export type Milestone = z.infer<typeof milestoneSchema>

export const statSchema = z.object({
  value: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
})
export type Stat = z.infer<typeof statSchema>

export const aboutContentSchema = z.object({
  hero: heroSchema.default({}),
  introHtml: html().default(''),
  storyHtml: html().default(''),
  stats: z.array(statSchema).max(12).default([]),
  values: z.array(valueSchema).max(12).default([]),
  timeline: z.array(milestoneSchema).max(30).default([]),
})
export type AboutContent = z.infer<typeof aboutContentSchema>

// ── contact ───────────────────────────────────────────
export const contactContentSchema = z.object({
  hero: heroSchema.default({}),
  email: z.string().max(100).default(''),
  phone: z.string().max(50).default(''),
  address: z.string().max(300).default(''),
  hours: z.string().max(200).default(''),
  mapEmbedUrl: z.string().max(500).default(''),
  showForm: z.boolean().default(true),
  formIntro: z.string().max(500).default(''),
  successMessage: z.string().max(300).default('提交成功，我们会尽快与您联系。'),
})
export type ContactContent = z.infer<typeof contactContentSchema>

// ── generic ───────────────────────────────────────────
export const genericContentSchema = z.object({
  bodyHtml: html().default(''),
})
export type GenericContent = z.infer<typeof genericContentSchema>

// ── 分派 ──────────────────────────────────────────────
/**
 * content 的完整形状。用 discriminatedUnion 让「template ↔ content」
 * 在类型层就对得上：home 的页面不会带 about 的字段。
 */
export const pageContentSchema = z.discriminatedUnion('template', [
  z.object({ template: z.literal('home'), content: homeContentSchema }),
  z.object({ template: z.literal('about'), content: aboutContentSchema }),
  z.object({ template: z.literal('contact'), content: contactContentSchema }),
  z.object({ template: z.literal('generic'), content: genericContentSchema }),
])
export type PageContent = z.infer<typeof pageContentSchema>

export function contentSchemaFor(template: PageTemplate) {
  switch (template) {
    case 'home':
      return homeContentSchema
    case 'about':
      return aboutContentSchema
    case 'contact':
      return contactContentSchema
    case 'generic':
      return genericContentSchema
    default:
      return genericContentSchema
  }
}

export function emptyContentFor(template: PageTemplate) {
  return contentSchemaFor(template).parse({})
}

// ── API 形态 ──────────────────────────────────────────
export const pageDto = z.object({
  id: z.string(),
  slug: z.string(),
  template: z.enum(PAGE_TEMPLATES),
  title: z.string(),
  summary: z.string().nullable(),
  status,
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  meta: metaSchema,
  // content 是「template 决定形状」的自由体，DTO 层不再收窄
  content: z.record(z.unknown()),
})
export type PageDto = z.infer<typeof pageDto>

export const pageCreateSchema = z.object({
  slug,
  template: z.enum(PAGE_TEMPLATES),
  title: text(200),
  summary: nullableText(500),
  status: status.default('draft'),
  publishedAt: isoDateTime.optional(),
  meta: metaSchema.optional(),
  content: z.unknown().default({}),
})
export type PageCreate = z.infer<typeof pageCreateSchema>

export const pageUpdateSchema = pageCreateSchema.partial()
export type PageUpdate = z.infer<typeof pageUpdateSchema>

export const pageListQuery = z.object({
  q: z.string().max(200).optional(),
  template: z.enum(PAGE_TEMPLATES).optional(),
  status: status.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

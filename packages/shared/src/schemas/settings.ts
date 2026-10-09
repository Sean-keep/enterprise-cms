import { z } from 'zod'
import { id, mediaId, text } from './common'

/** 站点配置：单行。id 固定为 "singleton"，不存在并发写。 */
export const siteSettingsSchema = z.object({
  siteName: z.string().max(100).default(''),
  tagline: z.string().max(255).default(''),
  logoMediaId: mediaId.default(null),
  faviconMediaId: mediaId.default(null),
  defaultOgMediaId: mediaId.default(null),
  contactEmail: z.string().max(100).default(''),
  contactPhone: z.string().max(50).default(''),
  contactAddress: z.string().max(300).default(''),
  icpBeian: z.string().max(100).default(''),
  footerText: z.string().max(1000).default(''),
})
export type SiteSettings = z.infer<typeof siteSettingsSchema>

export const siteSettingsUpdate = siteSettingsSchema.partial()
export type SiteSettingsUpdate = z.infer<typeof siteSettingsUpdate>

/** 公开接口一次取齐：站点配置 + 各菜单。首页/布局只打一个请求。 */
export const publicSiteSchema = z.object({
  settings: siteSettingsSchema,
  menus: z.array(z.object({
    key: z.string(),
    name: z.string(),
    items: z.array(z.any()),
  })),
})
export type PublicSite = z.infer<typeof publicSiteSchema>

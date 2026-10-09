import { db } from '../db'
import { sanitizePlain } from '../lib/sanitize'
import { siteSettingsSchema, type SiteSettings, type SiteSettingsUpdate } from '@cms/shared'

/**
 * 站点配置。单行记录，id 固定 "singleton"。
 * upsert —— 首次访问时自动建行，不需要「先去后台初始化」这一步。
 */
const SINGLETON = 'singleton'

function toDto(row: {
  siteName: string
  tagline: string
  logoMediaId: string | null
  faviconMediaId: string | null
  defaultOgMediaId: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactAddress: string | null
  icpBeian: string | null
  footerText: string | null
}): SiteSettings {
  return siteSettingsSchema.parse({
    siteName: row.siteName,
    tagline: row.tagline,
    logoMediaId: row.logoMediaId,
    faviconMediaId: row.faviconMediaId,
    defaultOgMediaId: row.defaultOgMediaId,
    contactEmail: row.contactEmail ?? '',
    contactPhone: row.contactPhone ?? '',
    contactAddress: row.contactAddress ?? '',
    icpBeian: row.icpBeian ?? '',
    footerText: row.footerText ?? '',
  })
}

export async function getSettings(): Promise<SiteSettings> {
  const row = await db.siteSetting.upsert({
    where: { id: SINGLETON },
    update: {},
    create: { id: SINGLETON, siteName: '企业官网' },
  })
  return toDto(row)
}

export async function updateSettings(input: SiteSettingsUpdate): Promise<SiteSettings> {
  const current = await getSettings()
  const merged = siteSettingsSchema.parse({ ...current, ...input })

  const row = await db.siteSetting.update({
    where: { id: SINGLETON },
    data: {
      siteName: sanitizePlain(merged.siteName),
      tagline: sanitizePlain(merged.tagline),
      logoMediaId: merged.logoMediaId,
      faviconMediaId: merged.faviconMediaId,
      defaultOgMediaId: merged.defaultOgMediaId,
      contactEmail: sanitizePlain(merged.contactEmail),
      contactPhone: sanitizePlain(merged.contactPhone),
      contactAddress: sanitizePlain(merged.contactAddress),
      icpBeian: sanitizePlain(merged.icpBeian),
      footerText: merged.footerText,
    },
  })
  return toDto(row)
}

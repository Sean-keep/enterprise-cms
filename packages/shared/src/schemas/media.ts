import { z } from 'zod'

/**
 * 媒体库。
 *
 * 库里存 `path`（存储键），不存完整 URL —— 换成 S3 时 URL 由
 * StorageAdapter 生成，数据不用改。前端拿 `url` 字段直接用。
 */
export const mediaDto = z.object({
  id: z.string(),
  filename: z.string(),
  path: z.string(),
  mime: z.string(),
  size: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: z.string().nullable(),
  url: z.string(),
  createdAt: z.date(),
})
export type MediaDto = z.infer<typeof mediaDto>

export const mediaUpdate = z.object({
  alt: z.string().max(255).nullable(),
  filename: z.string().max(255).optional(),
})

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
] as const

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

import { mkdir, writeFile, unlink, stat } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { randomUUID } from 'node:crypto'
import { db } from '../db'
import { config } from '../config'
import { badRequest, notFound } from '../lib/http'
import { sanitizePlain } from '../lib/sanitize'
import { ALLOWED_IMAGE_MIMES, MAX_UPLOAD_BYTES, type MediaDto } from '@cms/shared'

/**
 * 媒体存储。
 *
 * 业务只依赖 StorageAdapter 这个接口；换 S3 时加一个实现类，
 * 数据库里存的仍是 `path` 存储键，不用迁移。
 */
export interface StorageAdapter {
  put(key: string, data: Buffer): Promise<void>
  remove(key: string): Promise<void>
  /** 对外可访问的 URL */
  url(key: string): string
}

export class LocalDiskStorage implements StorageAdapter {
  constructor(private readonly root: string) {}

  async put(key: string, data: Buffer): Promise<void> {
    const target = this.resolve(key)
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, data)
  }

  async remove(key: string): Promise<void> {
    await unlink(this.resolve(key)).catch(() => {})
  }

  url(key: string): string {
    return `/uploads/${key}`
  }

  /** path traversal 防护：解析后必须仍在 root 内 */
  private resolve(key: string): string {
    const target = join(this.root, key)
    const normalized = target.replace(/\\/g, '/')
    const rootNormalized = this.root.replace(/\\/g, '/').replace(/\/$/, '')
    if (!normalized.startsWith(rootNormalized + '/')) {
      throw badRequest('非法文件路径')
    }
    return target
  }
}

export const storage: StorageAdapter = new LocalDiskStorage(config.UPLOAD_DIR)

function toDto(row: {
  id: string
  filename: string
  path: string
  mime: string
  size: number
  width: number | null
  height: number | null
  alt: string | null
  createdAt: Date
}): MediaDto {
  return { ...row, url: storage.url(row.path) }
}

/** 生成存储键：按年月分目录，uuid 做文件名 —— 不要沿用用户给的原始名，会撞车也会带奇怪字符 */
function buildKey(originalName: string, mime: string): string {
  const now = new Date()
  const ym = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
  const ext = extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '') ||
    (mime.split('/')[1] ? `.${mime.split('/')[1]}` : '')
  return `${ym}/${randomUUID()}${ext}`
}

export async function saveUpload(input: {
  filename: string
  mime: string
  data: Buffer
  alt?: string | null
  uploadedBy?: string
}): Promise<MediaDto> {
  if (!ALLOWED_IMAGE_MIMES.includes(input.mime as (typeof ALLOWED_IMAGE_MIMES)[number])) {
    throw badRequest(`不支持的文件类型 ${input.mime}`)
  }
  if (input.data.length > MAX_UPLOAD_BYTES) {
    throw badRequest(`文件超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB 限制`)
  }

  const key = buildKey(input.filename, input.mime)
  await storage.put(key, input.data)

  const row = await db.media.create({
    data: {
      filename: sanitizePlain(basename(input.filename)).slice(0, 255) || 'upload',
      path: key,
      mime: input.mime,
      size: input.data.length,
      alt: input.alt ? sanitizePlain(input.alt) : null,
      createdBy: input.uploadedBy,
    },
  })
  return toDto(row)
}

export async function listMedia(page: number, pageSize: number) {
  const [total, rows] = await Promise.all([
    db.media.count(),
    db.media.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
  ])
  return { items: rows.map(toDto), total }
}

export async function getMedia(id: string): Promise<MediaDto> {
  const row = await db.media.findUnique({ where: { id } })
  if (!row) throw notFound('文件')
  return toDto(row)
}

export async function deleteMedia(id: string): Promise<void> {
  const row = await db.media.findUnique({ where: { id } })
  if (!row) throw notFound('文件')
  await storage.remove(row.path)
  await db.media.delete({ where: { id } })
}

export async function updateMedia(id: string, input: { alt?: string | null; filename?: string }): Promise<MediaDto> {
  const row = await db.media.update({
    where: { id },
    data: {
      ...(input.alt !== undefined ? { alt: input.alt ? sanitizePlain(input.alt) : null } : {}),
      ...(input.filename !== undefined ? { filename: sanitizePlain(input.filename).slice(0, 255) } : {}),
    },
  })
  return toDto(row)
}

/** 校验磁盘上的文件还在 —— 卷被清过会引用到不存在的图 */
export async function mediaExists(path: string): Promise<boolean> {
  try {
    await stat(join(config.UPLOAD_DIR, path))
    return true
  } catch {
    return false
  }
}

import type { FastifyInstance, FastifyRequest } from 'fastify'
import { createHash, randomBytes } from 'node:crypto'
import { db } from '../db'
import { config } from '../config'
import { COOKIE_OPTIONS, SESSION_COOKIE, unauthorized, forbidden } from '../lib/http'
import type { UserDto, UserRole } from '@cms/shared'

declare module 'fastify' {
  interface FastifyRequest {
    user: UserDto | null
  }
}

/**
 * 手写 session。
 *
 * cookie 只放随机明文 token，库存 sha256 —— 库被拖走伪造不了会话。
 * 不引第三方 auth 库：需求就是「登录 + 两个角色」，引个框架背的依赖债比省的代码多。
 */

const TTL_MS = config.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function toUserDto(u: {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: Date
}): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as UserRole,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }
}

export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + TTL_MS),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
    },
  })
  return token
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } })
}

/** 顺手清过期会话，避免 sessions 表无限长。 */
export async function pruneSessions(): Promise<void> {
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}

async function resolveUser(request: FastifyRequest): Promise<UserDto | null> {
  const token = request.cookies?.[SESSION_COOKIE]
  if (!token) return null

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  if (!session.user.isActive) return null

  // last_used_at 是审计线索，也是以后做「踢掉闲置会话」的依据
  db.session
    .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  return toUserDto(session.user)
}

export function registerAuth(app: FastifyInstance) {
  app.decorateRequest('user', null)

  // 每个请求都解析一次会话，后面按需再挡 —— 公开接口也要能读到登录态（未来给预览用）
  app.addHook('preHandler', async (request) => {
    request.user = await resolveUser(request)
  })
}

/** 要求已登录。 */
export async function requireAuth(request: FastifyRequest) {
  if (!request.user) throw unauthorized()
}

/** 要求指定角色。admin 天然包含 editor 的能力。 */
export function requireRole(...roles: UserRole[]) {
  const allowed = new Set<UserRole>(roles)
  // admin 天然包含 editor 的能力 —— editor 的门 admin 也要能进。
  // 别写成「admin 的门 editor 也能进」，那等于谁都能改站点设置。
  if (allowed.has('editor')) allowed.add('admin')
  return async (request: FastifyRequest) => {
    if (!request.user) throw unauthorized()
    if (!allowed.has(request.user.role)) {
      throw forbidden(`需要 ${roles.join(' / ')} 权限`)
    }
  }
}

export function setSessionCookie(reply: { setCookie: Function }, token: string) {
  reply.setCookie(SESSION_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: TTL_MS / 1000 })
}

export function clearSessionCookie(reply: { clearCookie: Function }) {
  reply.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS)
}

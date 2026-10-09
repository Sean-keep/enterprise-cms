import type { FastifyReply } from 'fastify'

/**
 * 响应外壳。成功 `{ data }`，失败 `{ error: { code, message } }`。
 * HTTP 状态码表达结果，error.code 给前端做分支，别靠字符串匹配 message。
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const notFound = (what = '资源') => new ApiError(404, 'NOT_FOUND', `${what}不存在`)
export const badRequest = (message: string) => new ApiError(400, 'BAD_REQUEST', message)
export const unauthorized = (message = '请先登录') => new ApiError(401, 'UNAUTHORIZED', message)
export const forbidden = (message = '没有权限') => new ApiError(403, 'FORBIDDEN', message)
export const conflict = (message: string) => new ApiError(409, 'CONFLICT', message)

export function ok<T>(reply: FastifyReply, data: T, status = 200) {
  return reply.status(status).send({ data })
}

export function paged<T>(reply: FastifyReply, items: T[], total: number, page: number, pageSize: number) {
  return ok(reply, { items, total, page, pageSize })
}

export const SESSION_COOKIE = 'cms_session'

export const COOKIE_OPTIONS = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

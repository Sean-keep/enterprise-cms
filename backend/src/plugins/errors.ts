import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { ApiError } from '../lib/http'

/**
 * 统一错误出口。
 *
 * zod / Prisma / 自定义 ApiError 三种来源都要落回同一种响应形状，
 * 否则前端得为每种异常写一套解析。意外异常一律 500 + 不泄露堆栈。
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, request, reply) => {
    if (err instanceof ApiError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message },
      })
    }

    if (err instanceof ZodError) {
      const first = err.issues[0]
      const where = first?.path.join('.') || '参数'
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: `${where}：${first?.message ?? '格式不正确'}`,
          // 给表单做逐字段回显
          issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      })
    }

    // Prisma 已知约束冲突 —— 最常见的是 slug / email 撞唯一索引
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        const field = (err.meta?.target as string[] | undefined)?.join(', ') ?? '字段'
        return reply.status(409).send({
          error: { code: 'CONFLICT', message: `${field} 已存在` },
        })
      }
      if (err.code === 'P2025') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: '资源不存在' },
        })
      }
      if (err.code === 'P2003') {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: '引用的关联记录不存在' },
        })
      }
    }

    request.log.error(err)
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    })
  })

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `接口 ${request.method} ${request.url} 不存在` },
    })
  })
}

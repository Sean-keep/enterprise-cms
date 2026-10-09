import { PrismaClient } from '@prisma/client'

/**
 * Prisma 单例。tsx watch 下模块会重复求值，挂 globalThis 防连接泄漏。
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

export const db = globalForPrisma.__prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = db
}

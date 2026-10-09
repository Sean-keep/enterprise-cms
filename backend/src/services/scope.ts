import type { Prisma } from '@prisma/client'

/**
 * 公开读的**唯一**过滤器。
 *
 * 这是防 draft 泄露的关键：公开接口只允许走带 publishedScope 的查询。
 * 任何地方手写 `db.post.findMany({ where: ... })` 都可能把未发布内容漏给搜索引擎。
 * 新增内容类型时，把它的 where 片段加到这里，不要在 route 里现拼。
 */
export const publishedScope = {
  status: 'published',
  publishedAt: { lte: new Date() },
} satisfies Prisma.PostWhereInput

/** list 接口的通用分页。 */
export function pagination(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}

/** SQL LIKE 的通配符要转义，否则用户搜 "%" 会命中全表。 */
export function likeTerm(q: string | undefined): string | undefined {
  if (!q || !q.trim()) return undefined
  return `%${q.trim().replace(/[\\%_]/g, (m) => `\\${m}`)}%`
}

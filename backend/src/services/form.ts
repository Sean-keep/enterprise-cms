import { db } from '../db'
import { sanitizePlain } from '../lib/sanitize'
import { badRequest } from '../lib/http'
import { pagination, likeTerm } from './scope'
import type { ContactSubmit, FormSubmissionDto, FormStatus } from '@cms/shared'

/**
 * 表单收集。联系表单是**全网公开写入口**，最容易被灌爆的那个 ——
 * 简单 IP 限流在 route 层做，这里只管落库和查询。
 */

function toDto(row: {
  id: string
  formKey: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  subject: string | null
  message: string
  status: string
  note: string | null
  sourceUrl: string | null
  ip: string | null
  createdAt: Date
}): FormSubmissionDto {
  return { ...row, status: row.status as FormStatus }
}

export async function submitContact(
  input: ContactSubmit,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<void> {
  if (!input.message.trim()) throw badRequest('留言内容不能为空')
  await db.formSubmission.create({
    data: {
      formKey: input.formKey || 'contact',
      name: sanitizePlain(input.name),
      email: input.email ? sanitizePlain(input.email) : null,
      phone: input.phone ? sanitizePlain(input.phone) : null,
      company: input.company ? sanitizePlain(input.company) : null,
      subject: input.subject ? sanitizePlain(input.subject) : null,
      message: sanitizePlain(input.message),
      sourceUrl: input.sourceUrl ? sanitizePlain(input.sourceUrl).slice(0, 500) : null,
      ip: meta.ip?.slice(0, 45) ?? null,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
    },
  })
}

export async function listSubmissions(query: {
  status?: string
  formKey?: string
  q?: string
  page: number
  pageSize: number
}) {
  const term = likeTerm(query.q)
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.formKey ? { formKey: query.formKey } : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term } },
            { email: { contains: term } },
            { company: { contains: term } },
            { subject: { contains: term } },
            { message: { contains: term } },
          ],
        }
      : {}),
  }
  const [total, rows] = await Promise.all([
    db.formSubmission.count({ where }),
    db.formSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...pagination(query.page, query.pageSize),
    }),
  ])
  return { items: rows.map(toDto), total }
}

export async function updateSubmission(
  id: string,
  input: { status?: FormStatus; note?: string | null },
): Promise<FormSubmissionDto> {
  const row = await db.formSubmission.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.note !== undefined ? { note: input.note ? sanitizePlain(input.note) : null } : {}),
    },
  })
  return toDto(row)
}

export async function submissionStats() {
  const [total, unread] = await Promise.all([
    db.formSubmission.count(),
    db.formSubmission.count({ where: { status: 'new' } }),
  ])
  return { total, unread }
}

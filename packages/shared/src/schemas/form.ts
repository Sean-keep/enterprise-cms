import { z } from 'zod'
import { FORM_STATUSES } from '../constants'
import { paginationQuery, text } from './common'

/**
 * 表单收集。联系表单的字段是固定的，用真列而不是 JSON ——
 * 要按状态筛选、按时间倒序看，这些都需要索引。
 * `formKey` 留给以后的「预约演示」等多表单，本轮只有 contact。
 */

export const contactSubmit = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(100).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  company: z.string().max(100).optional().or(z.literal('')),
  subject: z.string().max(200).optional().or(z.literal('')),
  message: z.string().min(1).max(5000),
  sourceUrl: z.string().max(500).optional().or(z.literal('')),
  formKey: z.string().max(50).default('contact'),
})
export type ContactSubmit = z.infer<typeof contactSubmit>

export const formSubmissionDto = z.object({
  id: z.string(),
  formKey: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  company: z.string().nullable(),
  subject: z.string().nullable(),
  message: z.string(),
  status: z.enum(FORM_STATUSES),
  note: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: z.date(),
})
export type FormSubmissionDto = z.infer<typeof formSubmissionDto>

export const formSubmissionUpdate = z.object({
  status: z.enum(FORM_STATUSES).optional(),
  note: z.string().max(2000).nullable().optional(),
})

export const formListQuery = paginationQuery.extend({
  status: z.enum(FORM_STATUSES).optional(),
  formKey: z.string().max(50).optional(),
  q: z.string().max(200).optional(),
})

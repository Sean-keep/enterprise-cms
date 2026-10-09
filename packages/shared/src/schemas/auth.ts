import { z } from 'zod'
import { USER_ROLES } from '../constants'

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
})
export type LoginInput = z.infer<typeof loginSchema>

export const userDto = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(USER_ROLES),
  isActive: z.boolean(),
  createdAt: z.date(),
})
export type UserDto = z.infer<typeof userDto>

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1).max(200),
  newPassword: z.string().min(6).max(200),
})

export const userCreate = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(200),
  name: z.string().min(1).max(100),
  role: z.enum(USER_ROLES).default('editor'),
})

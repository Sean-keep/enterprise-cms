import { db } from '../db'
import { badRequest, unauthorized } from '../lib/http'
import { hashPassword, verifyPassword } from '../lib/password'
import type { LoginInput, UserDto } from '@cms/shared'

function toDto(u: {
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
    role: u.role as UserDto['role'],
    isActive: u.isActive,
    createdAt: u.createdAt,
  }
}

/**
 * 登录。故意不在错误信息里区分「邮箱不存在」和「密码错」——
 * 那等于给撞库一个逐字段试探的接口。
 */
export async function login(input: LoginInput): Promise<UserDto> {
  const user = await db.user.findUnique({ where: { email: input.email.toLowerCase() } })
  if (!user || !user.isActive) {
    throw unauthorized('邮箱或密码不正确')
  }
  const ok = await verifyPassword(input.password, user.passwordHash)
  if (!ok) {
    throw unauthorized('邮箱或密码不正确')
  }
  return toDto(user)
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
  if (newPassword.length < 6) throw badRequest('新密码至少 6 位')
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) throw unauthorized()
  if (!(await verifyPassword(oldPassword, user.passwordHash))) {
    throw badRequest('原密码不正确')
  }
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  })
}

export async function createUser(input: {
  email: string
  password: string
  name: string
  role: string
}): Promise<UserDto> {
  const existing = await db.user.findUnique({ where: { email: input.email.toLowerCase() } })
  if (existing) throw badRequest('该邮箱已被使用')
  const user = await db.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      name: input.name,
      role: input.role,
    },
  })
  return toDto(user)
}

export async function listUsers(): Promise<UserDto[]> {
  const users = await db.user.findMany({ orderBy: { createdAt: 'asc' } })
  return users.map(toDto)
}

import { z } from 'zod'

/**
 * 环境变量。启动时校验，缺了直接炸 —— 比运行到一半才发现配置错好。
 * 不读默认值的部分（密钥类）刻意留空，逼部署时显式给。
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BACKEND_PORT: z.coerce.number().default(4000),
  BACKEND_HOST: z.string().default('0.0.0.0'),
  SESSION_SECRET: z.string().min(8),
  SESSION_TTL_DAYS: z.coerce.number().default(7),
  UPLOAD_DIR: z.string().default('uploads'),
  // 后端写完内容后打它做 on-demand revalidate —— 漏了就会「后台改了官网不更新」
  WEB_BASE_URL: z.string().default('http://localhost:3000'),
  REVALIDATE_SECRET: z.string().min(8),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  throw new Error(`环境变量不合法：\n  ${missing.join('\n  ')}`)
}

export const config = parsed.data

import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { join } from 'node:path'
import { config } from './config'
import { registerErrorHandler } from './plugins/errors'
import { registerAuth } from './plugins/auth'
import { publicRoutes } from './routes/public'
import { adminRoutes } from './routes/admin'
import { MAX_UPLOAD_BYTES } from '@cms/shared'

export async function buildApp() {
  const app = Fastify({
    // 反代后 request.ip 才是真实客户端 IP，联系表单限流靠它
    trustProxy: true,
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'info',
      transport: process.stdout.isTTY ? undefined : undefined,
    },
    bodyLimit: 2 * 1024 * 1024,
  })

  await app.register(cookie, { secret: config.SESSION_SECRET })

  await app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  })

  // 上传的图要能被官网直接引用 —— 不能挂在登录后面，否则外站分享的图全是裂图
  await app.register(fastifyStatic, {
    root: join(process.cwd(), config.UPLOAD_DIR),
    prefix: '/uploads/',
    // 图片会被人反复引用，长缓存；但不要 immutable —— 同名覆盖时还能救
    maxAge: '7d',
    index: false,
    list: false,
  })

  registerErrorHandler(app)
  registerAuth(app)

  await app.register(publicRoutes)
  await app.register(adminRoutes)

  return app
}

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { buildApp } from './app'
import { config } from './config'

/**
 * 入口。启动前先把上传目录建出来 —— 否则第一次上传会因为目录不存在而失败，
 * 而那个错误看起来像权限问题，排查起来很费时间。
 */
async function main() {
  await mkdir(join(process.cwd(), config.UPLOAD_DIR), { recursive: true })

  const app = await buildApp()
  await app.listen({ port: config.BACKEND_PORT, host: config.BACKEND_HOST })

  const shutdown = async (signal: string) => {
    app.log.info(`收到 ${signal}，正在关闭…`)
    try {
      await app.close()
      process.exit(0)
    } catch {
      process.exit(1)
    }
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('启动失败：', err)
  process.exit(1)
})

import type { Metadata } from 'next'
import './globals.css'
import './site.css'

export const metadata: Metadata = {
  // 各页面的 generateMetadata 会覆盖；这里是全站兜底
  title: { default: '企业官网', template: '%s - 企业官网' },
  description: '企业官方网站',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}

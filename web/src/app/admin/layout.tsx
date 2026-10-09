import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '内容管理',
  // 后台不参与 SEO —— 不能被搜索引擎抓到
  robots: { index: false, follow: false },
}

/** 后台全部动态渲染，不做静态化。 */
export const dynamic = 'force-dynamic'

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children
}

import type { NextConfig } from 'next'

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '')

const nextConfig: NextConfig = {
  // workspace 包直接发 TS 源码，需要告诉 Next 转译
  transpilePackages: ['@cms/shared'],

  images: {
    remotePatterns: [{ protocol: 'http', hostname: '**' }, { protocol: 'https', hostname: '**' }],
    unoptimized: true,
  },

  /**
   * 同源反代到后端。
   *
   * 这样浏览器永远只跟一个源打交道：session cookie 不用谈 CORS / SameSite
   * 的跨站细节，上传的图片也走同一个域，外站引用不会裂。
   *
   * 注意顺序：Next 自己的 /api/contact 与 /api/revalidate 在前，
   * 下面这几条是兜底，不会被它们抢走。
   */
  async rewrites() {
    return [
      { source: '/api/admin/:path*', destination: `${API_BASE}/api/admin/:path*` },
      { source: '/api/public/:path*', destination: `${API_BASE}/api/public/:path*` },
      { source: '/api/health', destination: `${API_BASE}/api/health` },
      { source: '/uploads/:path*', destination: `${API_BASE}/uploads/:path*` },
    ]
  },

  poweredByHeader: false,
}

export default nextConfig

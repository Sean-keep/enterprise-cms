import { publicApi } from '@/lib/api'
import { Header } from '@/components/site/Header'
import { Footer } from '@/components/site/Footer'
import type { MenuItemDto } from '@cms/shared'

/**
 * 公开站布局。头尾数据来自后端的 /api/public/site，
 * 带 `site` + `menus` 两个 tag —— 后台改菜单或站点配置时会被 revalidate 刷掉。
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await publicApi.site().catch(() => null)

  if (!site) {
    // 后端没起来时也别白屏 —— 至少能看见是「数据不可用」而不是挂了
    return (
      <>
        <header className="site-header">
          <div className="site-header-inner">
            <span className="site-logo">企业官网</span>
          </div>
        </header>
        <main className="site-main">
          <div className="container section">
            <div className="alert alert-error">站点数据暂时无法加载，请稍后重试。</div>
          </div>
        </main>
      </>
    )
  }

  const mainMenu = site.menus.find((m) => m.key === 'main')
  const footerMenu = site.menus.find((m) => m.key === 'footer')

  return (
    <>
      <Header settings={site.settings} items={(mainMenu?.items ?? []) as (MenuItemDto & { href: string })[]} />
      <main className="site-main">{children}</main>
      <Footer settings={site.settings} footerItems={(footerMenu?.items ?? []) as (MenuItemDto & { href: string })[]} />
    </>
  )
}

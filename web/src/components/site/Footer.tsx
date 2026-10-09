import Link from 'next/link'
import type { MenuItemDto, SiteSettings } from '@cms/shared'

type MenuEntry = MenuItemDto & { href: string }

export function Footer({
  settings,
  footerItems,
}: {
  settings: SiteSettings
  footerItems: MenuEntry[]
}) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>{settings.siteName || '企业官网'}</h4>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, maxWidth: 360 }}>
              {settings.tagline}
            </p>
            {settings.contactAddress ? (
              <p style={{ margin: '12px 0 0', fontSize: 13.5 }}>{settings.contactAddress}</p>
            ) : null}
          </div>

          <div>
            <h4>快速链接</h4>
            <ul>
              {footerItems.map((it) => (
                <li key={it.id}>
                  <Link href={it.href}>{it.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>联系方式</h4>
            <ul>
              {settings.contactPhone ? <li>{settings.contactPhone}</li> : null}
              {settings.contactEmail ? <li>{settings.contactEmail}</li> : null}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>{settings.footerText || `© ${new Date().getFullYear()} ${settings.siteName}`}</span>
          {settings.icpBeian ? (
            <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer">
              {settings.icpBeian}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  )
}

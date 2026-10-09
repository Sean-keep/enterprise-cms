import Link from 'next/link'
import type { MenuItemDto, SiteSettings } from '@cms/shared'

type MenuEntry = MenuItemDto & { href: string }

export function Header({
  settings,
  items,
}: {
  settings: SiteSettings
  items: MenuEntry[]
}) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-logo">
          {settings.logoMediaId ? <span aria-hidden>▣</span> : null}
          <span>{settings.siteName || '企业官网'}</span>
        </Link>
        <nav className="site-nav">
          {items.map((it) => (
            <Link key={it.id} href={it.href} target={it.openInNew ? '_blank' : undefined}>
              {it.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

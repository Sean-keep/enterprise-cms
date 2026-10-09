import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-.03em' }}>404</div>
        <h1 style={{ fontSize: 20, marginTop: 8 }}>页面不存在</h1>
        <p className="muted">你要找的内容可能已被移动或删除，也可能还没发布。</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
          <Link href="/" className="btn btn-primary">回到首页</Link>
          <Link href="/news" className="btn">看看新闻</Link>
        </div>
      </div>
    </div>
  )
}

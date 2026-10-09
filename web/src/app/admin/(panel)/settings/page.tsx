'use client'

import { useEffect, useState } from 'react'
import { adminApi, errMsg } from '@/lib/admin-api'
import { Text, TextArea } from '@/components/admin/fields'
import { MediaPicker } from '@/components/admin/MediaPicker'
import type { SiteSettings } from '@cms/shared'

export default function AdminSettingsPage() {
  const [f, setF] = useState<SiteSettings | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [saving, setSaving] = useState(false)
  const [revalidating, setRevalidating] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        setF(await adminApi.get<SiteSettings>('/api/admin/settings'))
      } catch (e) {
        setError(errMsg(e))
      }
    })()
  }, [])

  const patch = (p: Partial<SiteSettings>) => setF((s) => (s ? { ...s, ...p } : s))

  async function save() {
    if (!f) return
    setSaving(true)
    setError('')
    setOk('')
    try {
      const saved = await adminApi.put<SiteSettings>('/api/admin/settings', f)
      setF(saved)
      setOk('已保存。官网的页头页脚会立即刷新。')
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  /**
   * 缓存逃生门。正常流程是「后台保存 → 自动 revalidate」，
   * 这个按钮只在运营说「官网没更新」时用。
   */
  async function revalidateNow() {
    setRevalidating(true)
    setOk('')
    setError('')
    try {
      await adminApi.post('/api/admin/revalidate', { all: true })
      setOk('已触发全站缓存刷新。')
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setRevalidating(false)
    }
  }

  if (!f) return <div className="empty" style={{ padding: 60 }}>{error || '加载中…'}</div>

  return (
    <div>
      <div className="row row-between" style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>站点设置</h1>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存设置'}
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {ok ? <div className="alert alert-ok">{ok}</div> : null}

      <div className="card">
        <h3 className="card-title">基本信息</h3>
        <div className="row row-2">
          <Text label="站点名称" value={f.siteName} onChange={(v) => patch({ siteName: v })} required />
          <Text label="标语" value={f.tagline} onChange={(v) => patch({ tagline: v })} />
        </div>
        <MediaPicker label="Logo" value={f.logoMediaId} onChange={(v) => patch({ logoMediaId: v })} />
        <div className="row row-2">
          <MediaPicker label="Favicon" value={f.faviconMediaId} onChange={(v) => patch({ faviconMediaId: v })} />
          <MediaPicker label="默认社交分享图" value={f.defaultOgMediaId} onChange={(v) => patch({ defaultOgMediaId: v })} hint="内容没单独配 OG 图时用这张" />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">联系方式</h3>
        <div className="row row-2">
          <Text label="邮箱" value={f.contactEmail} onChange={(v) => patch({ contactEmail: v })} />
          <Text label="电话" value={f.contactPhone} onChange={(v) => patch({ contactPhone: v })} />
        </div>
        <TextArea label="地址" value={f.contactAddress} onChange={(v) => patch({ contactAddress: v })} rows={2} />
      </div>

      <div className="card">
        <h3 className="card-title">页脚与备案</h3>
        <Text label="ICP 备案号" value={f.icpBeian} onChange={(v) => patch({ icpBeian: v })} hint="会自动链接到工信部备案查询" />
        <Text label="页脚文案" value={f.footerText} onChange={(v) => patch({ footerText: v })} />
      </div>

      <div className="card">
        <h3 className="card-title">缓存</h3>
        <p className="muted" style={{ fontSize: 13.5 }}>
          后台保存内容后会自动刷新官网缓存。如果看到官网没更新，点下面这个强制刷一次 ——
          这是逃生门，不是常规流程。
        </p>
        <button type="button" className="btn" onClick={revalidateNow} disabled={revalidating}>
          {revalidating ? '刷新中…' : '强制刷新官网缓存'}
        </button>
      </div>
    </div>
  )
}

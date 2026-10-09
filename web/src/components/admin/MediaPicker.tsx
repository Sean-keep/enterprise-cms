'use client'

import { useEffect, useState } from 'react'
import { adminApi, errMsg } from '@/lib/admin-api'
import type { MediaDto } from '@cms/shared'

/**
 * 媒体选择器：上传 + 从库里挑 + 取消选择。
 *
 * 存的是 mediaId，不是 URL —— 换存储（S3）时 URL 由后端生成，内容不用改。
 */
export function MediaPicker({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string | null
  onChange: (id: string | null) => void
  hint?: string
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<MediaDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.get<{ items: MediaDto[] }>('/api/admin/media?pageSize=24')
      setItems(res.items)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void load()
  }, [open])

  async function upload(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const created = await adminApi.post<MediaDto>('/api/admin/media', fd)
      onChange(created.id)
      setOpen(false)
    } catch (e) {
      setError(errMsg(e))
    }
  }

  const selected = items.find((m) => m.id === value)

  return (
    <div className="field">
      <label>{label}</label>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)}>
          {value ? '更换' : '选择图片'}
        </button>
        {value ? (
          <button type="button" className="btn btn-sm btn-danger" onClick={() => onChange(null)}>
            清除
          </button>
        ) : null}
        {value ? (
          <span className="muted" style={{ fontSize: 12.5 }}>
            已选 <span className="mono">{value.slice(0, 8)}…</span>
          </span>
        ) : (
          <span className="muted" style={{ fontSize: 12.5 }}>未选择</span>
        )}
      </div>

      {hint ? <div className="field-hint">{hint}</div> : null}
      {error ? <div className="field-error">{error}</div> : null}

      {open ? (
        <div
          style={{
            marginTop: 10,
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: 12,
            background: 'var(--bg-soft)',
          }}
        >
          <label className="btn btn-sm" style={{ marginBottom: 12, display: 'inline-flex' }}>
            上传新图片
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void upload(f)
                e.target.value = ''
              }}
            />
          </label>

          {loading ? <div className="empty" style={{ padding: 20 }}>加载中…</div> : null}

          {!loading && items.length === 0 ? (
            <div className="empty" style={{ padding: 20 }}>媒体库是空的，先上传一张。</div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.id)
                  setOpen(false)
                }}
                style={{
                  border: m.id === value ? '2px solid var(--brand)' : '1px solid var(--line)',
                  borderRadius: 6,
                  padding: 3,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt || m.filename}
                  style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 4 }}
                />
              </button>
            ))}
          </div>

          {selected ? null : null}
        </div>
      ) : null}
    </div>
  )
}

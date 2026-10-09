'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { adminApi, errMsg } from '@/lib/admin-api'
import {
  CONTENT_STATUS_LABELS,
  PAGE_TEMPLATE_LABELS,
  PAGE_TEMPLATES,
  CONTENT_STATUSES,
  type PageDto,
} from '@cms/shared'

export default function AdminPagesList() {
  const [items, setItems] = useState<PageDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [template, setTemplate] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (q) params.set('q', q)
      if (template) params.set('template', template)
      if (status) params.set('status', status)
      const res = await adminApi.get<{ items: PageDto[]; total: number }>(`/api/admin/pages?${params}`)
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, template, status])

  async function remove(p: PageDto) {
    if (!confirm(`确定删除页面「${p.title}」？此操作不可恢复。`)) return
    try {
      await adminApi.del(`/api/admin/pages/${p.id}`)
      void load()
    } catch (e) {
      setError(errMsg(e))
    }
  }

  return (
    <div>
      <div className="row row-between" style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>页面</h1>
        <Link href="/admin/pages/new" className="btn btn-primary">
          新建页面
        </Link>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="row" style={{ marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ maxWidth: 220 }}
            placeholder="搜索标题 / slug"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
          />
          <select className="select" style={{ maxWidth: 150 }} value={template} onChange={(e) => { setTemplate(e.target.value); setPage(1) }}>
            <option value="">全部模板</option>
            {PAGE_TEMPLATES.map((t) => (
              <option key={t} value={t}>{PAGE_TEMPLATE_LABELS[t]}</option>
            ))}
          </select>
          <select className="select" style={{ maxWidth: 130 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">全部状态</option>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>{CONTENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button type="button" className="btn" onClick={() => { setPage(1); void load() }}>搜索</button>
        </div>

        {loading ? (
          <div className="empty">加载中…</div>
        ) : items.length === 0 ? (
          <div className="empty">
            没有匹配的页面。
            <div className="mt-16">
              <Link href="/admin/pages/new" className="btn btn-primary">新建第一个页面</Link>
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>标题</th>
                <th>Slug</th>
                <th>模板</th>
                <th>状态</th>
                <th>更新时间</th>
                <th style={{ width: 140 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title}</strong>
                    {p.summary ? <div className="muted" style={{ fontSize: 12.5 }}>{p.summary.slice(0, 50)}</div> : null}
                  </td>
                  <td>
                    <span className="mono">{p.slug}</span>
                    <a
                      href={`/${p.slug === 'home' ? '' : p.slug}`}
                      target="_blank"
                      className="btn-link"
                      style={{ marginLeft: 8, fontSize: 12 }}
                    >
                      查看
                    </a>
                  </td>
                  <td>
                    <span className="tag tag-brand">{PAGE_TEMPLATE_LABELS[p.template]}</span>
                  </td>
                  <td>
                    <span
                      className={`tag ${
                        p.status === 'published' ? 'tag-ok' : p.status === 'draft' ? 'tag-warn' : ''
                      }`}
                    >
                      {CONTENT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="muted">{new Date(p.updatedAt).toLocaleString('zh-CN')}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <Link href={`/admin/pages/${p.id}`} className="btn btn-sm">编辑</Link>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(p)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 20 ? (
          <div className="row row-end mt-16" style={{ gap: 8 }}>
            <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
              上一页
            </button>
            <span className="muted" style={{ alignSelf: 'center' }}>第 {page} 页 / 共 {Math.ceil(total / 20)} 页</span>
            <button
              type="button"
              className="btn btn-sm"
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => setPage((n) => n + 1)}
            >
              下一页
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

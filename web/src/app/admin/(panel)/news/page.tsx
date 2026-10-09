'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { adminApi, errMsg } from '@/lib/admin-api'
import { CONTENT_STATUS_LABELS, CONTENT_STATUSES, type PostDto } from '@cms/shared'

export default function AdminNewsList() {
  const [items, setItems] = useState<PostDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (status) params.set('status', status)
      if (q) params.set('q', q)
      const res = await adminApi.get<{ items: PostDto[]; total: number }>(`/api/admin/posts?${params}`)
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [page, status, q])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(p: PostDto) {
    if (!confirm(`确定删除「${p.title}」？`)) return
    try {
      await adminApi.del(`/api/admin/posts/${p.id}`)
      void load()
    } catch (e) {
      setError(errMsg(e))
    }
  }

  return (
    <div>
      <div className="row row-between" style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>新闻</h1>
        <Link href="/admin/news/new" className="btn btn-primary">写一篇新闻</Link>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="row" style={{ marginBottom: 14, gap: 10 }}>
          <input
            className="input"
            style={{ maxWidth: 220 }}
            placeholder="搜索标题 / slug"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="select"
            style={{ maxWidth: 130 }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
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
            还没有新闻。
            <div className="mt-16">
              <Link href="/admin/news/new" className="btn btn-primary">写第一篇</Link>
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>标题</th>
                <th>分类</th>
                <th>状态</th>
                <th>发布时间</th>
                <th style={{ width: 140 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title}</strong>
                    {p.isFeatured ? <span className="tag tag-brand" style={{ marginLeft: 8 }}>推荐</span> : null}
                    <div className="muted mono" style={{ fontSize: 12 }}>{p.slug}</div>
                  </td>
                  <td>{p.category?.name ?? <span className="muted">未分类</span>}</td>
                  <td>
                    <span className={`tag ${p.status === 'published' ? 'tag-ok' : 'tag-warn'}`}>
                      {CONTENT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="muted">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleString('zh-CN') : '—'}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <Link href={`/admin/news/${p.id}`} className="btn btn-sm">编辑</Link>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(p)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 20 ? (
          <div className="row row-end mt-16" style={{ gap: 8 }}>
            <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>上一页</button>
            <span className="muted" style={{ alignSelf: 'center' }}>第 {page} 页 / 共 {Math.ceil(total / 20)} 页</span>
            <button type="button" className="btn btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((n) => n + 1)}>下一页</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

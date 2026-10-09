'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminApi, errMsg } from '@/lib/admin-api'
import { FORM_STATUSES, FORM_STATUS_LABELS, type FormSubmissionDto, type FormStatus } from '@cms/shared'

/**
 * 留言列表。公开写入口最容易被灌爆 —— 后台要能快速把垃圾标掉，
 * 所以状态切换就地做，不进详情页。
 */
export default function AdminContactPage() {
  const [items, setItems] = useState<FormSubmissionDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (status) params.set('status', status)
      const res = await adminApi.get<{ items: FormSubmissionDto[]; total: number }>(`/api/admin/forms?${params}`)
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatusOf(id: string, next: FormStatus) {
    try {
      await adminApi.patch(`/api/admin/forms/${id}`, { status: next })
      setItems((s) => s.map((it) => (it.id === id ? { ...it, status: next } : it)))
    } catch (e) {
      setError(errMsg(e))
    }
  }

  return (
    <div>
      <div className="row row-between" style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>留言</h1>
        <span className="muted">共 {total} 条</span>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="row" style={{ marginBottom: 14, gap: 10 }}>
          <select
            className="select"
            style={{ maxWidth: 140 }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">全部状态</option>
            {FORM_STATUSES.map((s) => (
              <option key={s} value={s}>{FORM_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="empty">加载中…</div>
        ) : items.length === 0 ? (
          <div className="empty">还没有留言。</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>联系方式</th>
                <th>内容</th>
                <th>时间</th>
                <th style={{ width: 220 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    {r.company ? <div className="muted" style={{ fontSize: 12 }}>{r.company}</div> : null}
                  </td>
                  <td className="muted" style={{ fontSize: 12.5 }}>
                    {r.email ? <div>{r.email}</div> : null}
                    {r.phone ? <div>{r.phone}</div> : null}
                  </td>
                  <td style={{ maxWidth: 340 }}>
                    {r.subject ? <div style={{ fontWeight: 550 }}>{r.subject}</div> : null}
                    <div className="muted">
                      {openId === r.id ? r.message : r.message.slice(0, 80) + (r.message.length > 80 ? '…' : '')}
                    </div>
                    {r.message.length > 80 ? (
                      <button
                        type="button"
                        className="btn-link"
                        style={{ fontSize: 12 }}
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      >
                        {openId === r.id ? '收起' : '展开'}
                      </button>
                    ) : null}
                  </td>
                  <td className="muted" style={{ fontSize: 12.5 }}>
                    {new Date(r.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td>
                    <select
                      className="select"
                      value={r.status}
                      onChange={(e) => setStatusOf(r.id, e.target.value as FormStatus)}
                    >
                      {FORM_STATUSES.map((s) => (
                        <option key={s} value={s}>{FORM_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 20 ? (
          <div className="row row-end mt-16" style={{ gap: 8 }}>
            <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>上一页</button>
            <span className="muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
            <button type="button" className="btn btn-sm" disabled={page * 20 >= total} onClick={() => setPage((n) => n + 1)}>下一页</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

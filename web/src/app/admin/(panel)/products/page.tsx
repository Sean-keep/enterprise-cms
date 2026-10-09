'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { adminApi, errMsg } from '@/lib/admin-api'
import {
  CONTENT_STATUS_LABELS,
  PRODUCT_KINDS,
  PRODUCT_KIND_LABELS,
  type ProductDto,
} from '@cms/shared'

export default function AdminProductsList() {
  const [items, setItems] = useState<ProductDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (kind) params.set('kind', kind)
      if (q) params.set('q', q)
      const res = await adminApi.get<{ items: ProductDto[]; total: number }>(`/api/admin/products?${params}`)
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [page, kind, q])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(p: ProductDto) {
    if (!confirm(`确定删除「${p.title}」？`)) return
    try {
      await adminApi.del(`/api/admin/products/${p.id}`)
      void load()
    } catch (e) {
      setError(errMsg(e))
    }
  }

  return (
    <div>
      <div className="row row-between" style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>产品 / 服务 / 案例</h1>
        <Link href="/admin/products/new" className="btn btn-primary">新建</Link>
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
            value={kind}
            onChange={(e) => {
              setKind(e.target.value)
              setPage(1)
            }}
          >
            <option value="">全部类型</option>
            {PRODUCT_KINDS.map((k) => (
              <option key={k} value={k}>{PRODUCT_KIND_LABELS[k]}</option>
            ))}
          </select>
          <button type="button" className="btn" onClick={() => { setPage(1); void load() }}>搜索</button>
        </div>

        {loading ? (
          <div className="empty">加载中…</div>
        ) : items.length === 0 ? (
          <div className="empty">
            还没有内容。
            <div className="mt-16">
              <Link href="/admin/products/new" className="btn btn-primary">新建第一条</Link>
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>标题</th>
                <th>类型</th>
                <th>排序</th>
                <th>状态</th>
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
                  <td><span className="tag">{PRODUCT_KIND_LABELS[p.kind]}</span></td>
                  <td className="muted">{p.sortOrder}</td>
                  <td>
                    <span className={`tag ${p.status === 'published' ? 'tag-ok' : 'tag-warn'}`}>
                      {CONTENT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <Link href={`/admin/products/${p.id}`} className="btn btn-sm">编辑</Link>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(p)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

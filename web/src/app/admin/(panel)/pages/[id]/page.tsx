'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminApi, errMsg } from '@/lib/admin-api'
import { PageForm } from '@/components/admin/PageForm'
import type { PageDto } from '@cms/shared'

/**
 * 页面编辑。`id` 是路由参数，特殊值 `new` 表示新建 ——
 * 省掉一个独立的 /new 路由文件。
 */
export default function AdminPageEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === 'new'

  const [page, setPage] = useState<PageDto | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    void (async () => {
      try {
        setPage(await adminApi.get<PageDto>(`/api/admin/pages/${id}`))
      } catch (e) {
        setError(errMsg(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isNew])

  if (loading) return <div className="empty" style={{ padding: 60 }}>加载中…</div>
  if (error && !isNew) return <div className="alert alert-error">{error}</div>

  return (
    <div>
      <div className="row row-between" style={{ marginBottom: 18 }}>
        <div>
          <Link href="/admin/pages" className="btn-link">
            ← 返回页面列表
          </Link>
          <h1 style={{ fontSize: 22, margin: '8px 0 0' }}>{isNew ? '新建页面' : `编辑：${page?.title}`}</h1>
        </div>
      </div>

      <PageForm
        page={page}
        onSaved={(saved) => {
          if (isNew) {
            router.push(`/admin/pages/${saved.id}`)
          } else {
            setPage(saved)
          }
        }}
      />
    </div>
  )
}

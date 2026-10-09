'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminApi, errMsg } from '@/lib/admin-api'
import { ProductForm } from '@/components/admin/ProductForm'
import type { ProductDto } from '@cms/shared'

export default function AdminProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === 'new'

  const [product, setProduct] = useState<ProductDto | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    void (async () => {
      try {
        setProduct(await adminApi.get<ProductDto>(`/api/admin/products/${id}`))
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
      <Link href="/admin/products" className="btn-link">← 返回列表</Link>
      <h1 style={{ fontSize: 22, margin: '8px 0 18px' }}>
        {isNew ? '新建产品/服务/案例' : `编辑：${product?.title}`}
      </h1>

      <ProductForm
        product={product}
        onSaved={(saved) => {
          if (isNew) router.push(`/admin/products/${saved.id}`)
          else setProduct(saved)
        }}
      />
    </div>
  )
}

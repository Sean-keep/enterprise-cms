'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminApi, errMsg } from '@/lib/admin-api'
import { PostForm } from '@/components/admin/PostForm'
import type { PostDto } from '@cms/shared'

export default function AdminPostEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === 'new'

  const [post, setPost] = useState<PostDto | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    void (async () => {
      try {
        setPost(await adminApi.get<PostDto>(`/api/admin/posts/${id}`))
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
      <Link href="/admin/news" className="btn-link">← 返回新闻列表</Link>
      <h1 style={{ fontSize: 22, margin: '8px 0 18px' }}>{isNew ? '写新闻' : `编辑：${post?.title}`}</h1>

      <PostForm
        post={post}
        onSaved={(saved) => {
          if (isNew) router.push(`/admin/news/${saved.id}`)
          else setPost(saved)
        }}
      />
    </div>
  )
}

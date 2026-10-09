'use client'

import { useEffect, useState } from 'react'
import { Text, TextArea, Select, Checkbox } from './fields'
import { MediaPicker } from './MediaPicker'
import { RichText } from './RichText'
import { adminApi, errMsg } from '@/lib/admin-api'
import { CONTENT_STATUSES, CONTENT_STATUS_LABELS, type PostDto, type PostCategoryDto } from '@cms/shared'

export function PostForm({ post, onSaved }: { post: PostDto | null; onSaved: (p: PostDto) => void }) {
  const [categories, setCategories] = useState<PostCategoryDto[]>([])
  const [f, setF] = useState({
    slug: post?.slug ?? '',
    title: post?.title ?? '',
    summary: post?.summary ?? '',
    body: post?.body ?? '',
    coverMediaId: post?.coverMediaId ?? null,
    categoryId: post?.categoryId ?? '',
    status: post?.status ?? 'draft',
    isFeatured: post?.isFeatured ?? false,
    metaTitle: post?.meta.title ?? '',
    metaDescription: post?.meta.description ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void adminApi
      .get<PostCategoryDto[]>('/api/admin/post-categories')
      .then(setCategories)
      .catch(() => {})
  }, [])

  const patch = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }))

  async function save() {
    setSaving(true)
    setError('')
    const payload = {
      slug: f.slug,
      title: f.title,
      summary: f.summary || null,
      body: f.body,
      coverMediaId: f.coverMediaId,
      categoryId: f.categoryId || null,
      status: f.status,
      isFeatured: f.isFeatured,
      meta: { title: f.metaTitle, description: f.metaDescription, keywords: '', ogImageId: null, canonicalUrl: '' },
    }
    try {
      const saved = post
        ? await adminApi.put<PostDto>(`/api/admin/posts/${post.id}`, payload)
        : await adminApi.post<PostDto>('/api/admin/posts', payload)
      onSaved(saved)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <h3 className="card-title">内容</h3>
        <Text label="标题" value={f.title} onChange={(v) => patch({ title: v })} required />
        <div className="row row-2">
          <Text
            label="Slug（URL）"
            value={f.slug}
            onChange={(v) => patch({ slug: v })}
            required
            hint="小写字母、数字、连字符"
          />
          <Select
            label="分类"
            value={f.categoryId}
            onChange={(v) => patch({ categoryId: v })}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            allowEmpty
          />
        </div>
        <TextArea label="摘要" value={f.summary} onChange={(v) => patch({ summary: v })} rows={2} hint="列表展示和 SEO 描述" />
        <div className="field">
          <label>正文</label>
          <RichText value={f.body} onChange={(v) => patch({ body: v })} />
        </div>
        <MediaPicker label="封面图" value={f.coverMediaId} onChange={(v) => patch({ coverMediaId: v })} />
      </div>

      <div className="card">
        <h3 className="card-title">发布</h3>
        <div className="row row-2">
          <Select
            label="状态"
            value={f.status}
            onChange={(v) => patch({ status: v })}
            options={CONTENT_STATUSES.map((s) => ({ value: s, label: CONTENT_STATUS_LABELS[s] }))}
          />
          <Checkbox label="设为推荐" checked={f.isFeatured} onChange={(v) => patch({ isFeatured: v })} hint="首页和列表会优先展示" />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">SEO</h3>
        <Text label="SEO 标题" value={f.metaTitle} onChange={(v) => patch({ metaTitle: v })} hint="留空则用文章标题" />
        <TextArea label="SEO 描述" value={f.metaDescription} onChange={(v) => patch({ metaDescription: v })} rows={2} />
      </div>

      <div className="row row-end mt-24">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '保存中…' : post ? '保存修改' : '发布'}
        </button>
      </div>
    </div>
  )
}

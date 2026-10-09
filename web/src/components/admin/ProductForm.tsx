'use client'

import { useEffect, useState } from 'react'
import { Text, TextArea, Select, Checkbox, Repeater } from './fields'
import { MediaPicker } from './MediaPicker'
import { RichText } from './RichText'
import { adminApi, errMsg } from '@/lib/admin-api'
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  PRODUCT_KINDS,
  PRODUCT_KIND_LABELS,
  type ProductDto,
  type ProductCategoryDto,
} from '@cms/shared'

export function ProductForm({ product, onSaved }: { product: ProductDto | null; onSaved: (p: ProductDto) => void }) {
  const [categories, setCategories] = useState<ProductCategoryDto[]>([])
  const [f, setF] = useState({
    slug: product?.slug ?? '',
    kind: product?.kind ?? 'product',
    title: product?.title ?? '',
    subtitle: product?.subtitle ?? '',
    summary: product?.summary ?? '',
    body: product?.body ?? '',
    coverMediaId: product?.coverMediaId ?? null,
    categoryId: product?.categoryId ?? '',
    isFeatured: product?.isFeatured ?? false,
    sortOrder: String(product?.sortOrder ?? 0),
    // Repeater 是「结构化子表单」，要对象数组；库存的是 string[]，存取时换一层
    highlights: (product?.highlights ?? []).map((t) => ({ text: t })),
    clientName: product?.clientName ?? '',
    industry: product?.industry ?? '',
    status: product?.status ?? 'draft',
    metaTitle: product?.meta.title ?? '',
    metaDescription: product?.meta.description ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void adminApi
      .get<ProductCategoryDto[]>('/api/admin/product-categories')
      .then(setCategories)
      .catch(() => {})
  }, [])

  const patch = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }))
  const isCase = f.kind === 'case'

  async function save() {
    setSaving(true)
    setError('')
    const payload = {
      slug: f.slug,
      kind: f.kind,
      title: f.title,
      subtitle: f.subtitle || null,
      summary: f.summary || null,
      body: f.body,
      coverMediaId: f.coverMediaId,
      categoryId: f.categoryId || null,
      isFeatured: f.isFeatured,
      sortOrder: Number(f.sortOrder) || 0,
      highlights: f.highlights.map((h) => h.text.trim()).filter(Boolean),
      clientName: isCase ? f.clientName || null : null,
      industry: isCase ? f.industry || null : null,
      status: f.status,
      meta: { title: f.metaTitle, description: f.metaDescription, keywords: '', ogImageId: null, canonicalUrl: '' },
    }
    try {
      const saved = product
        ? await adminApi.put<ProductDto>(`/api/admin/products/${product.id}`, payload)
        : await adminApi.post<ProductDto>('/api/admin/products', payload)
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
        <div className="row row-2">
          <Select
            label="类型"
            value={f.kind}
            onChange={(v) => patch({ kind: v })}
            options={PRODUCT_KINDS.map((k) => ({ value: k, label: PRODUCT_KIND_LABELS[k] }))}
            hint="产品 / 服务 / 案例共用一张表，靠类型区分。"
            required
          />
          <Text label="标题" value={f.title} onChange={(v) => patch({ title: v })} required />
        </div>
        <div className="row row-2">
          <Text label="Slug（URL）" value={f.slug} onChange={(v) => patch({ slug: v })} required />
          <Text label="副标题" value={f.subtitle} onChange={(v) => patch({ subtitle: v })} />
        </div>
        <div className="row row-2">
          <Select
            label="分类"
            value={f.categoryId}
            onChange={(v) => patch({ categoryId: v })}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            allowEmpty
          />
          <Text label="排序值" type="number" value={f.sortOrder} onChange={(v) => patch({ sortOrder: v })} hint="小的排前面" />
        </div>
        <TextArea label="摘要" value={f.summary} onChange={(v) => patch({ summary: v })} rows={2} />

        <div className="field">
          <label>正文</label>
          <RichText value={f.body} onChange={(v) => patch({ body: v })} />
        </div>

        <MediaPicker label="封面图" value={f.coverMediaId} onChange={(v) => patch({ coverMediaId: v })} />

        <Repeater
          label="核心卖点"
          hint="列表页会展示前几条。固定形状：一句话。"
          items={f.highlights}
          onChange={(v) => patch({ highlights: v })}
          makeNew={() => ({ text: '' })}
          addLabel="添加一条卖点"
          max={12}
          renderRow={(item, _i, patchRow) => (
            <Text label="内容" value={item.text} onChange={(v) => patchRow({ text: v })} required />
          )}
        />
      </div>

      {isCase ? (
        <div className="card">
          <h3 className="card-title">案例信息</h3>
          <div className="row row-2">
            <Text label="客户名称" value={f.clientName} onChange={(v) => patch({ clientName: v })} />
            <Text label="所属行业" value={f.industry} onChange={(v) => patch({ industry: v })} />
          </div>
        </div>
      ) : null}

      <div className="card">
        <h3 className="card-title">发布</h3>
        <Checkbox label="设为推荐" checked={f.isFeatured} onChange={(v) => patch({ isFeatured: v })} />
        <Select
          label="状态"
          value={f.status}
          onChange={(v) => patch({ status: v })}
          options={CONTENT_STATUSES.map((s) => ({ value: s, label: CONTENT_STATUS_LABELS[s] }))}
        />
      </div>

      <div className="card">
        <h3 className="card-title">SEO</h3>
        <Text label="SEO 标题" value={f.metaTitle} onChange={(v) => patch({ metaTitle: v })} />
        <TextArea label="SEO 描述" value={f.metaDescription} onChange={(v) => patch({ metaDescription: v })} rows={2} />
      </div>

      <div className="row row-end mt-24">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '保存中…' : product ? '保存修改' : '创建'}
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Text, TextArea, Select, Checkbox, Repeater } from './fields'
import { MediaPicker } from './MediaPicker'
import { RichText } from './RichText'
import { adminApi, errMsg } from '@/lib/admin-api'
import {
  PAGE_TEMPLATES,
  PAGE_TEMPLATE_LABELS,
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  emptyContentFor,
  contentSchemaFor,
  type PageDto,
  type PageTemplate,
} from '@cms/shared'
import type { z } from 'zod'

/**
 * 页面表单。**按 template 切换字段** —— 这是「通用页面表 + 模板分派」的兑现处。
 *
 * 切换模板时，content 会按新模板的 zod schema 重新 parse 一次补默认值，
 * 所以不会留下错形状的 JSON。服务端入库前做同样的事，两边不会漂。
 */

type FormState = {
  slug: string
  template: PageTemplate
  title: string
  summary: string
  status: string
  publishedAt: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  metaCanonical: string
  content: Record<string, unknown>
}

function toForm(page: PageDto | null): FormState {
  if (!page) {
    return {
      slug: '',
      template: 'generic',
      title: '',
      summary: '',
      status: 'draft',
      publishedAt: '',
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      metaCanonical: '',
      content: emptyContentFor('generic') as Record<string, unknown>,
    }
  }
  return {
    slug: page.slug,
    template: page.template,
    title: page.title,
    summary: page.summary ?? '',
    status: page.status,
    publishedAt: page.publishedAt ? new Date(page.publishedAt).toISOString().slice(0, 16) : '',
    metaTitle: page.meta.title ?? '',
    metaDescription: page.meta.description ?? '',
    metaKeywords: page.meta.keywords ?? '',
    metaCanonical: page.meta.canonicalUrl ?? '',
    content: { ...emptyContentFor(page.template), ...(page.content as Record<string, unknown>) },
  }
}

export function PageForm({ page, onSaved }: { page: PageDto | null; onSaved: (p: PageDto) => void }) {
  const [form, setForm] = useState<FormState>(() => toForm(page))
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function patch(p: Partial<FormState>) {
    setForm((s) => ({ ...s, ...p }))
  }

  function setContent(key: string, value: unknown) {
    setForm((s) => ({ ...s, content: { ...s.content, [key]: value } }))
  }

  /** 换模板：按新 schema 重新补默认值，避免带着旧模板的字段走 */
  function switchTemplate(next: PageTemplate) {
    const parsed = contentSchemaFor(next).parse({}) as Record<string, unknown>
    setForm((s) => ({ ...s, template: next, content: parsed }))
  }

  async function save() {
    setSaving(true)
    setError('')
    setFieldErrors({})

    // 入库前先用同一份 zod 自检一次 —— 提前把错误指到具体字段，
    // 不用等后端返回再整表回滚
    const parsed = contentSchemaFor(form.template).safeParse(form.content)
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const issue of parsed.error.issues) errs[`content.${issue.path.join('.')}`] = issue.message
      setFieldErrors(errs)
      setSaving(false)
      return
    }

    const payload = {
      slug: form.slug,
      template: form.template,
      title: form.title,
      summary: form.summary || null,
      status: form.status,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      meta: {
        title: form.metaTitle,
        description: form.metaDescription,
        keywords: form.metaKeywords,
        ogImageId: (form.content as { ogImageId?: string | null }).ogImageId ?? null,
        canonicalUrl: form.metaCanonical,
      },
      content: parsed.data,
    }

    try {
      const saved = page
        ? await adminApi.put<PageDto>(`/api/admin/pages/${page.id}`, payload)
        : await adminApi.post<PageDto>('/api/admin/pages', payload)
      onSaved(saved)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {error ? (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card">
        <h3 className="card-title">基本信息</h3>
        <div className="row row-2">
          <Text label="标题" value={form.title} onChange={(v) => patch({ title: v })} required />
          <Select
            label="模板"
            value={form.template}
            onChange={(v) => switchTemplate(v as PageTemplate)}
            options={PAGE_TEMPLATES.map((t) => ({ value: t, label: PAGE_TEMPLATE_LABELS[t] }))}
            hint="模板决定下面出现哪些字段。加新版式要改代码，不用改数据库。"
            required
          />
        </div>
        <div className="row row-2">
          <Text
            label="Slug（URL 路径）"
            value={form.slug}
            onChange={(v) => patch({ slug: v })}
            required
            hint="只能用小写字母、数字和连字符。首页固定是 home。"
            error={fieldErrors.slug}
          />
          <Text label="摘要" value={form.summary} onChange={(v) => patch({ summary: v })} hint="列表和 SEO description 用" />
        </div>
        <div className="row row-2">
          <Select
            label="状态"
            value={form.status}
            onChange={(v) => patch({ status: v })}
            options={CONTENT_STATUSES.map((s) => ({ value: s, label: CONTENT_STATUS_LABELS[s] }))}
          />
          <Text
            label="发布时间"
            value={form.publishedAt}
            onChange={(v) => patch({ publishedAt: v })}
            type="text"
            hint="格式 2026-10-09T12:00。留空则在首次发布时自动填当前时间。"
            placeholder="2026-10-09T12:00"
          />
        </div>
      </div>

      {/* ── 按模板分派的字段 ───────────────────────── */}
      <div className="card">
        <h3 className="card-title">{PAGE_TEMPLATE_LABELS[form.template]} · 内容</h3>
        <TemplateFields template={form.template} content={form.content} setContent={setContent} errors={fieldErrors} />
      </div>

      <div className="card">
        <h3 className="card-title">SEO</h3>
        <div className="row row-2">
          <Text
            label="SEO 标题"
            value={form.metaTitle}
            onChange={(v) => patch({ metaTitle: v })}
            hint="留空则用页面标题"
          />
          <Text
            label="SEO 关键词"
            value={form.metaKeywords}
            onChange={(v) => patch({ metaKeywords: v })}
            hint="逗号分隔"
          />
        </div>
        <TextArea label="SEO 描述" value={form.metaDescription} onChange={(v) => patch({ metaDescription: v })} rows={2} />
        <Text label="Canonical URL" value={form.metaCanonical} onChange={(v) => patch({ metaCanonical: v })} hint="留空则自动用页面地址" />
      </div>

      <div className="row row-end mt-24">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '保存中…' : page ? '保存修改' : '创建页面'}
        </button>
      </div>
    </div>
  )
}

// ── 各模板的字段 ──────────────────────────────────────

function TemplateFields({
  template,
  content,
  setContent,
  errors,
}: {
  template: PageTemplate
  content: Record<string, unknown>
  setContent: (key: string, value: unknown) => void
  errors: Record<string, string>
}) {
  if (template === 'home') {
    const hero = (content.hero ?? {}) as Record<string, string | null>
    const setHero = (k: string, v: unknown) => setContent('hero', { ...hero, [k]: v })

    return (
      <>
        <HeroFields hero={hero} setHero={setHero} />

        <RichText label="简介（HTML）" value={String(content.introHtml ?? '')} onChange={(v) => setContent('introHtml', v)} rows={6} />

        <Repeater
          label="核心优势"
          hint="首页中段的卡片。固定形状：图标 / 标题 / 描述。"
          items={(content.features ?? []) as Record<string, unknown>[]}
          onChange={(v) => setContent('features', v)}
          makeNew={() => ({ icon: '', title: '', description: '' })}
          renderRow={(item, _i, patch) => (
            <>
              <div className="row row-2">
                <Text label="图标（单字或符号）" value={String(item.icon ?? '')} onChange={(v) => patch({ icon: v })} />
                <Text label="标题" value={String(item.title ?? '')} onChange={(v) => patch({ title: v })} required />
              </div>
              <TextArea label="描述" value={String(item.description ?? '')} onChange={(v) => patch({ description: v })} rows={2} />
            </>
          )}
        />

        <div className="row row-2">
          <Checkbox label="展示产品预览" checked={content.showProducts !== false} onChange={(v) => setContent('showProducts', v)} />
          <Text
            label="产品数量"
            type="number"
            value={String(content.productLimit ?? 6)}
            onChange={(v) => setContent('productLimit', Number(v) || 0)}
          />
        </div>
        <div className="row row-2">
          <Checkbox label="展示新闻预览" checked={content.showNews !== false} onChange={(v) => setContent('showNews', v)} />
          <Text
            label="新闻数量"
            type="number"
            value={String(content.newsLimit ?? 6)}
            onChange={(v) => setContent('newsLimit', Number(v) || 0)}
          />
        </div>

        <Text label="合作区块标题" value={String(content.partnersTitle ?? '')} onChange={(v) => setContent('partnersTitle', v)} />
        <Repeater
          label="合作伙伴"
          items={(content.partners ?? []) as Record<string, unknown>[]}
          onChange={(v) => setContent('partners', v)}
          makeNew={() => ({ name: '', logoMediaId: null, url: '' })}
          addLabel="添加合作伙伴"
          renderRow={(item, _i, patch) => (
            <>
              <div className="row row-2">
                <Text label="名称" value={String(item.name ?? '')} onChange={(v) => patch({ name: v })} required />
                <Text label="链接" value={String(item.url ?? '')} onChange={(v) => patch({ url: v })} />
              </div>
              <MediaPicker
                label="Logo"
                value={(item.logoMediaId as string | null) ?? null}
                onChange={(v) => patch({ logoMediaId: v })}
              />
            </>
          )}
        />
      </>
    )
  }

  if (template === 'about') {
    const hero = (content.hero ?? {}) as Record<string, string | null>
    const setHero = (k: string, v: unknown) => setContent('hero', { ...hero, [k]: v })

    return (
      <>
        <HeroFields hero={hero} setHero={setHero} />
        <RichText label="简介（HTML）" value={String(content.introHtml ?? '')} onChange={(v) => setContent('introHtml', v)} rows={5} />
        <RichText label="我们的故事（HTML）" value={String(content.storyHtml ?? '')} onChange={(v) => setContent('storyHtml', v)} rows={8} />

        <Repeater
          label="数据指标"
          items={(content.stats ?? []) as Record<string, unknown>[]}
          onChange={(v) => setContent('stats', v)}
          makeNew={() => ({ value: '', label: '' })}
          addLabel="添加指标"
          renderRow={(item, _i, patch) => (
            <div className="row row-2">
              <Text label="数值" value={String(item.value ?? '')} onChange={(v) => patch({ value: v })} required />
              <Text label="标签" value={String(item.label ?? '')} onChange={(v) => patch({ label: v })} required />
            </div>
          )}
        />

        <Repeater
          label="价值观"
          items={(content.values ?? []) as Record<string, unknown>[]}
          onChange={(v) => setContent('values', v)}
          makeNew={() => ({ icon: '', title: '', description: '' })}
          addLabel="添加一条"
          renderRow={(item, _i, patch) => (
            <>
              <Text label="标题" value={String(item.title ?? '')} onChange={(v) => patch({ title: v })} required />
              <TextArea label="描述" value={String(item.description ?? '')} onChange={(v) => patch({ description: v })} rows={2} />
            </>
          )}
        />

        <Repeater
          label="发展历程"
          items={(content.timeline ?? []) as Record<string, unknown>[]}
          onChange={(v) => setContent('timeline', v)}
          makeNew={() => ({ year: '', title: '', description: '' })}
          addLabel="添加里程碑"
          renderRow={(item, _i, patch) => (
            <>
              <div className="row row-2">
                <Text label="年份" value={String(item.year ?? '')} onChange={(v) => patch({ year: v })} required />
                <Text label="标题" value={String(item.title ?? '')} onChange={(v) => patch({ title: v })} required />
              </div>
              <TextArea label="描述" value={String(item.description ?? '')} onChange={(v) => patch({ description: v })} rows={2} />
            </>
          )}
        />
      </>
    )
  }

  if (template === 'contact') {
    const hero = (content.hero ?? {}) as Record<string, string | null>
    const setHero = (k: string, v: unknown) => setContent('hero', { ...hero, [k]: v })

    return (
      <>
        <HeroFields hero={hero} setHero={setHero} />
        <div className="row row-2">
          <Text label="邮箱" value={String(content.email ?? '')} onChange={(v) => setContent('email', v)} />
          <Text label="电话" value={String(content.phone ?? '')} onChange={(v) => setContent('phone', v)} />
        </div>
        <TextArea label="地址" value={String(content.address ?? '')} onChange={(v) => setContent('address', v)} rows={2} />
        <div className="row row-2">
          <Text label="工作时间" value={String(content.hours ?? '')} onChange={(v) => setContent('hours', v)} />
          <Text label="地图嵌入地址" value={String(content.mapEmbedUrl ?? '')} onChange={(v) => setContent('mapEmbedUrl', v)} hint="iframe src，可留空" />
        </div>
        <Checkbox label="展示留言表单" checked={content.showForm !== false} onChange={(v) => setContent('showForm', v)} />
        <TextArea label="表单提示语" value={String(content.formIntro ?? '')} onChange={(v) => setContent('formIntro', v)} rows={2} />
        <Text label="提交成功提示" value={String(content.successMessage ?? '')} onChange={(v) => setContent('successMessage', v)} />
      </>
    )
  }

  // generic
  return (
    <RichText
      label="正文（HTML）"
      value={String(content.bodyHtml ?? '')}
      onChange={(v) => setContent('bodyHtml', v)}
      rows={16}
    />
  )
}

function HeroFields({
  hero,
  setHero,
}: {
  hero: Record<string, string | null>
  setHero: (k: string, v: unknown) => void
}) {
  return (
    <>
      <Text label="首屏标题" value={String(hero.title ?? '')} onChange={(v) => setHero('title', v)} />
      <Text label="首屏副标题" value={String(hero.subtitle ?? '')} onChange={(v) => setHero('subtitle', v)} />
      <MediaPicker label="首屏配图" value={(hero.imageId as string | null) ?? null} onChange={(v) => setHero('imageId', v)} />
      <div className="row row-2">
        <Text label="主按钮文字" value={String(hero.ctaText ?? '')} onChange={(v) => setHero('ctaText', v)} />
        <Text label="主按钮链接" value={String(hero.ctaUrl ?? '')} onChange={(v) => setHero('ctaUrl', v)} />
      </div>
      <div className="row row-2">
        <Text label="次按钮文字" value={String(hero.cta2Text ?? '')} onChange={(v) => setHero('cta2Text', v)} />
        <Text label="次按钮链接" value={String(hero.cta2Url ?? '')} onChange={(v) => setHero('cta2Url', v)} />
      </div>
    </>
  )
}

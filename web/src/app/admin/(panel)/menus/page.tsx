'use client'

import { useEffect, useState } from 'react'
import { adminApi, errMsg } from '@/lib/admin-api'
import { Text, Select, Checkbox } from '@/components/admin/fields'
import {
  MENU_LINK_TYPES,
  type MenuDto,
  type MenuItemDto,
  type MenuItemInput,
} from '@cms/shared'

/**
 * 菜单编辑。整树读、扁平写 —— 调层级只需改一行的 parentId，
 * 不用搬子树。页面上用缩进表示层级，不做拖拽（骨架阶段没必要）。
 */
type FlatItem = MenuItemInput

function flatten(items: MenuItemDto[], parentId: string | null = null, depth = 0): (FlatItem & { depth: number })[] {
  return items.flatMap((it) => [
    {
      id: it.id,
      parentId,
      label: it.label,
      linkType: it.linkType,
      pageId: it.pageId,
      postId: it.postId,
      productId: it.productId,
      categorySlug: it.categorySlug,
      url: it.url,
      sortOrder: it.sortOrder,
      openInNew: it.openInNew,
      depth,
    },
    ...flatten(it.children, it.id, depth + 1),
  ])
}

const LINK_LABELS: Record<string, string> = {
  page: '站内页面',
  post: '新闻文章',
  product: '产品/服务',
  category: '产品分类',
  url: '自定义链接',
}

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<MenuDto[]>([])
  const [activeKey, setActiveKey] = useState('main')
  const [items, setItems] = useState<FlatItem[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const list = await adminApi.get<MenuDto[]>('/api/admin/menus')
        setMenus(list)
        const first = list.find((m) => m.key === activeKey) ?? list[0]
        if (first) {
          setActiveKey(first.key)
          setItems(flatten(first.items))
        }
      } catch (e) {
        setError(errMsg(e))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function switchMenu(key: string) {
    const menu = menus.find((m) => m.key === key)
    if (!menu) return
    setActiveKey(key)
    setItems(flatten(menu.items))
  }

  const patch = (index: number, partial: Partial<FlatItem>) =>
    setItems((s) => s.map((it, i) => (i === index ? { ...it, ...partial } : it)))

  const remove = (index: number) => setItems((s) => s.filter((_, i) => i !== index))

  const move = (index: number, dir: -1 | 1) =>
    setItems((s) => {
      const next = [...s]
      const j = index + dir
      if (j < 0 || j >= next.length) return s
      ;[next[index], next[j]] = [next[j], next[index]]
      return next.map((it, i) => ({ ...it, sortOrder: i }))
    })

  async function save() {
    setSaving(true)
    setError('')
    setOk('')
    try {
      const menu = menus.find((m) => m.key === activeKey)
      if (!menu) return
      // 写回时用扁平列表，parentId 保持，sortOrder 按当前顺序重排
      const payload = items.map((it, i) => ({ ...it, sortOrder: i }))
      const updated = await adminApi.put<MenuDto>(`/api/admin/menus/${menu.id}`, { items: payload })
      setMenus((s) => s.map((m) => (m.key === activeKey ? updated : m)))
      setItems(flatten(updated.items))
      setOk('已保存，官网导航会立即刷新。')
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="row row-between" style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>导航菜单</h1>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存菜单'}
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {ok ? <div className="alert alert-ok">{ok}</div> : null}

      <div className="card">
        <div className="row" style={{ marginBottom: 16, gap: 8 }}>
          {menus.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`btn btn-sm ${m.key === activeKey ? 'btn-primary' : ''}`}
              onClick={() => switchMenu(m.key)}
            >
              {m.name}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="empty">这个菜单还没有条目。</div>
        ) : null}

        {items.map((it, i) => (
          <div
            key={it.id ?? i}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 14,
              marginBottom: 10,
              background: 'var(--bg-soft)',
              marginLeft: (it.depth ?? 0) * 24,
            }}
          >
            <div className="row row-between" style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 13, color: 'var(--fg-soft)' }}>
                #{i + 1} {(it.depth ?? 0) > 0 ? '↳ 子级' : '顶级'}
              </strong>
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" className="btn btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(i)}>删除</button>
              </div>
            </div>

            <div className="row row-2">
              <Text label="名称" value={it.label} onChange={(v) => patch(i, { label: v })} required />
              <Select
                label="链接类型"
                value={it.linkType}
                onChange={(v) => patch(i, { linkType: v as FlatItem['linkType'] })}
                options={MENU_LINK_TYPES.map((t) => ({ value: t, label: LINK_LABELS[t] ?? t }))}
              />
            </div>

            {it.linkType === 'url' ? (
              <Text
                label="链接地址"
                value={it.url ?? ''}
                onChange={(v) => patch(i, { url: v })}
                hint="如 /products 或 https://example.com"
              />
            ) : null}

            {it.linkType === 'category' ? (
              <Text
                label="分类 slug"
                value={it.categorySlug ?? ''}
                onChange={(v) => patch(i, { categorySlug: v })}
              />
            ) : null}

            {it.linkType === 'page' ? (
              <Text
                label="页面 ID"
                value={it.pageId ?? ''}
                onChange={(v) => patch(i, { pageId: v })}
                hint="在「页面」列表里复制 ID。首页请直接用自定义链接 /"
              />
            ) : null}

            {it.linkType === 'post' ? (
              <Text label="新闻 ID" value={it.postId ?? ''} onChange={(v) => patch(i, { postId: v })} hint="在「新闻」列表里复制 ID" />
            ) : null}

            {it.linkType === 'product' ? (
              <Text label="产品 ID" value={it.productId ?? ''} onChange={(v) => patch(i, { productId: v })} hint="在「产品」列表里复制 ID" />
            ) : null}

            <div className="row row-2">
              <Select
                label="上级"
                value={it.parentId ?? ''}
                onChange={(v) => patch(i, { parentId: v || null })}
                allowEmpty
                emptyLabel="（顶级）"
                options={items
                  .filter((other, j) => j !== i)
                  .map((other, j) => ({ value: other.id ?? `tmp-${j}`, label: other.label }))}
              />
              <Checkbox label="新窗口打开" checked={it.openInNew ?? false} onChange={(v) => patch(i, { openInNew: v })} />
            </div>
          </div>
        ))}

        <button
          type="button"
          className="btn"
          onClick={() =>
            setItems((s) => [
              ...s,
              {
                parentId: null,
                label: '新菜单项',
                linkType: 'url',
                pageId: null,
                postId: null,
                productId: null,
                categorySlug: null,
                url: '/',
                sortOrder: s.length,
                openInNew: false,
              },
            ])
          }
        >
          + 添加菜单项
        </button>
      </div>
    </div>
  )
}

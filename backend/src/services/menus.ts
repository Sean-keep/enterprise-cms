import { db } from '../db'
import { sanitizePlain } from '../lib/sanitize'
import { notFound, badRequest } from '../lib/http'
import type { MenuDto, MenuItemDto, MenuItemInput, MenuLocation } from '@cms/shared'

/**
 * 菜单。整树读、扁平写。
 *
 * 写入用「扁平列表 + parentId」而不是嵌套：调层级只需改一行的 parentId，
 * 嵌套则要搬整棵子树。读出时再组装成树给前台用。
 */

type MenuRow = {
  id: string
  key: string
  name: string
  items: {
    id: string
    parentId: string | null
    label: string
    linkType: string
    pageId: string | null
    postId: string | null
    productId: string | null
    categorySlug: string | null
    url: string | null
    sortOrder: number
    openInNew: boolean
  }[]
}

function buildTree(flat: MenuRow['items']): MenuItemDto[] {
  const byId = new Map<string, MenuItemDto>()
  for (const it of flat) {
    byId.set(it.id, {
      id: it.id,
      parentId: it.parentId,
      label: it.label,
      linkType: it.linkType as MenuItemDto['linkType'],
      pageId: it.pageId,
      postId: it.postId,
      productId: it.productId,
      categorySlug: it.categorySlug,
      url: it.url,
      sortOrder: it.sortOrder,
      openInNew: it.openInNew,
      children: [],
    })
  }
  const roots: MenuItemDto[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const sortRec = (nodes: MenuItemDto[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder)
    nodes.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

function toDto(row: MenuRow): MenuDto {
  return {
    id: row.id,
    key: row.key as MenuLocation,
    name: row.name,
    items: buildTree(row.items),
  }
}

export async function getMenu(key: string): Promise<MenuDto> {
  const row = await db.menu.findUnique({ where: { key }, include: { items: true } })
  if (!row) throw notFound('菜单')
  return toDto(row as MenuRow)
}

export async function listMenus(): Promise<MenuDto[]> {
  const rows = await db.menu.findMany({ include: { items: true }, orderBy: { key: 'asc' } })
  return rows.map((r) => toDto(r as MenuRow))
}

/**
 * 整树写回。先删后插比逐条 diff 简单可靠，菜单条目量小（几十条），
 * 而且本来就该当一个整体编辑。放在事务里，中途失败不会留下半棵残树。
 */
export async function replaceMenuItems(menuId: string, items: MenuItemInput[]): Promise<MenuDto> {
  const menu = await db.menu.findUnique({ where: { id: menuId } })
  if (!menu) throw notFound('菜单')
  if (items.length > 100) throw badRequest('菜单项最多 100 条')

  // parentId 必须指向同一批里的某一项，否则树会断
  const ids = new Set(items.map((i) => i.id).filter(Boolean) as string[])
  for (const it of items) {
    if (it.parentId && !ids.has(it.parentId)) {
      throw badRequest(`菜单项「${it.label}」的上级不存在`)
    }
  }

  await db.$transaction(async (tx) => {
    await tx.menuItem.deleteMany({ where: { menuId } })
    if (items.length === 0) return

    // 两轮插入：先不带 parent 的建好拿 id，再插有 parent 的，否则外键指向还没落库的行
    const idMap = new Map<string, string>()
    const withIds = items.map((it) => {
      const newId = it.id ?? crypto.randomUUID()
      if (it.id) idMap.set(it.id, newId)
      return { ...it, newId }
    })

    for (const it of withIds.filter((i) => !i.parentId)) {
      await tx.menuItem.create({
        data: {
          id: it.newId,
          menuId,
          label: sanitizePlain(it.label),
          linkType: it.linkType,
          pageId: it.pageId,
          postId: it.postId,
          productId: it.productId,
          categorySlug: it.categorySlug,
          url: it.url,
          sortOrder: it.sortOrder,
          openInNew: it.openInNew,
        },
      })
    }
    for (const it of withIds.filter((i) => i.parentId)) {
      await tx.menuItem.create({
        data: {
          id: it.newId,
          menuId,
          parentId: idMap.get(it.parentId!) ?? it.parentId,
          label: sanitizePlain(it.label),
          linkType: it.linkType,
          pageId: it.pageId,
          postId: it.postId,
          productId: it.productId,
          categorySlug: it.categorySlug,
          url: it.url,
          sortOrder: it.sortOrder,
          openInNew: it.openInNew,
        },
      })
    }
  })

  return getMenu(menu.key)
}

export async function updateMenu(id: string, input: { name?: string; items?: MenuItemInput[] }): Promise<MenuDto> {
  const menu = await db.menu.findUnique({ where: { id } })
  if (!menu) throw notFound('菜单')
  if (input.name !== undefined) {
    await db.menu.update({ where: { id }, data: { name: sanitizePlain(input.name) } })
  }
  if (input.items !== undefined) {
    return replaceMenuItems(id, input.items)
  }
  return getMenu(menu.key)
}

/**
 * 把菜单里的链接解析成实际 href。放在服务层 —— 前台和 sitemap 都要用，
 * 散在组件里写会两边不一致。
 */
export async function resolveMenuHrefs(items: MenuItemDto[]): Promise<(MenuItemDto & { href: string })[]> {
  const out: (MenuItemDto & { href: string })[] = []
  for (const it of items) {
    let href = it.url ?? '#'
    if (it.linkType === 'page' && it.pageId) {
      const p = await db.page.findUnique({ where: { id: it.pageId }, select: { slug: true } })
      href = p ? `/${p.slug === 'home' ? '' : p.slug}` : '#'
    } else if (it.linkType === 'post' && it.postId) {
      const p = await db.post.findUnique({ where: { id: it.postId }, select: { slug: true } })
      href = p ? `/news/${p.slug}` : '#'
    } else if (it.linkType === 'product' && it.productId) {
      const p = await db.product.findUnique({ where: { id: it.productId }, select: { slug: true } })
      href = p ? `/products/${p.slug}` : '#'
    } else if (it.linkType === 'category') {
      href = it.categorySlug ? `/products/category/${it.categorySlug}` : '#'
    }
    out.push({ ...it, href, children: await resolveMenuHrefs(it.children) })
  }
  return out
}

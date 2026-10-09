import { z } from 'zod'
import { MENU_LINK_TYPES, MENU_LOCATIONS } from '../constants'
import { id, text } from './common'

/**
 * 导航菜单。整树读写 —— 后台是「读出整棵树 → 改 → 整棵写回」，
 * 比逐条 item 的增删改排序接口简单得多，而且菜单本来就该整体编辑。
 */

export const menuItemSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  label: z.string(),
  linkType: z.enum(MENU_LINK_TYPES),
  pageId: z.string().nullable(),
  postId: z.string().nullable(),
  productId: z.string().nullable(),
  categorySlug: z.string().nullable(),
  url: z.string().nullable(),
  sortOrder: z.number().int(),
  openInNew: z.boolean(),
  children: z.array(z.lazy(() => menuItemSchema)).default([]),
})
export type MenuItemDto = z.infer<typeof menuItemSchema>

export const menuDto = z.object({
  id: z.string(),
  key: z.enum(MENU_LOCATIONS),
  name: z.string(),
  items: z.array(menuItemSchema),
})
export type MenuDto = z.infer<typeof menuDto>

/**
 * 写入形态用「扁平列表 + parentId」，不用嵌套 ——
 * 嵌套在调整层级时要处理子树搬移，扁平只是改一行的 parentId。
 */
export const menuItemInput = z.object({
  id: z.string().optional(),
  parentId: z.string().nullable().default(null),
  label: text(100),
  linkType: z.enum(MENU_LINK_TYPES),
  pageId: id.nullable().default(null),
  postId: id.nullable().default(null),
  productId: id.nullable().default(null),
  categorySlug: z.string().max(100).nullable().default(null),
  url: z.string().max(500).nullable().default(null),
  sortOrder: z.number().int().default(0),
  openInNew: z.boolean().default(false),
})
export type MenuItemInput = z.infer<typeof menuItemInput>

export const menuUpdateSchema = z.object({
  name: text(100).optional(),
  items: z.array(menuItemInput).max(100).optional(),
})
export type MenuUpdate = z.infer<typeof menuUpdateSchema>

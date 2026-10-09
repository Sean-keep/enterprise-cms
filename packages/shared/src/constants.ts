/**
 * 枚举常量。
 *
 * SQLite 的 Prisma 连接器不支持 enum 类型，所以库里存的是 String，
 * 取值范围由这里定义，并在 zod schema 里用 z.enum 强制。
 * 改这里 = 改前后端共同的取值集合，不用迁移数据库。
 */

// ── 页面 ──────────────────────────────────────────────
export const PAGE_TEMPLATES = ['home', 'about', 'contact', 'generic'] as const
export type PageTemplate = (typeof PAGE_TEMPLATES)[number]

export const PAGE_TEMPLATE_LABELS: Record<PageTemplate, string> = {
  home: '首页',
  about: '关于我们',
  contact: '联系我们',
  generic: '自定义页面',
}

// ── 通用状态 ──────────────────────────────────────────
export const CONTENT_STATUSES = ['draft', 'published', 'archived'] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
}

// ── 产品/服务/案例 ────────────────────────────────────
export const PRODUCT_KINDS = ['product', 'service', 'case'] as const
export type ProductKind = (typeof PRODUCT_KINDS)[number]

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  product: '产品',
  service: '服务',
  case: '案例',
}

// ── 菜单 ──────────────────────────────────────────────
export const MENU_LOCATIONS = ['main', 'footer'] as const
export type MenuLocation = (typeof MENU_LOCATIONS)[number]

export const MENU_LINK_TYPES = ['page', 'post', 'product', 'category', 'url'] as const
export type MenuLinkType = (typeof MENU_LINK_TYPES)[number]

// ── 留言 ──────────────────────────────────────────────
export const FORM_STATUSES = ['new', 'read', 'replied', 'spam'] as const
export type FormStatus = (typeof FORM_STATUSES)[number]

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  new: '未读',
  read: '已读',
  replied: '已回复',
  spam: '垃圾',
}

// ── 用户 ──────────────────────────────────────────────
export const USER_ROLES = ['admin', 'editor'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理员',
  editor: '编辑',
}

// ── 分页 ──────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100

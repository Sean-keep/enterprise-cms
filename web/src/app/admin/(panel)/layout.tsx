import { AdminShell } from '@/components/admin/AdminShell'

/**
 * 登录后的面板布局。和 /admin/login 分开在不同的路由组 ——
 * 登录页不该套后台侧边栏，也不该走登录态检查。
 */
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}

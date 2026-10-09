'use client'

/**
 * 后台用的客户端 API 封装。
 *
 * 直接打后端（同源反代或直连），带上 cookie —— session 是 httpOnly cookie，
 * 浏览器自动带，前端不碰 token。所有错误统一抛 ApiClientError，表单好回显。
 */

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly issues: { path: string; message: string }[] = [],
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

// 同源：Next 的 rewrites 把 /api/admin/*、/api/public/*、/uploads/* 转给后端。
// 浏览器只跟一个源打交道，session cookie 是普通的同源 httpOnly cookie。
// 若以后改成 nginx 反代，这里保持 '' 即可，业务代码不用动。
const BASE = ''

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isForm ? {} : { 'content-type': 'application/json' }),
      ...init.headers,
    },
  })

  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    /* 非 JSON */
  }

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; issues?: { path: string; message: string }[] } })
      ?.error
    throw new ApiClientError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `请求失败 (${res.status})`, err?.issues ?? [])
  }
  return (body as { data: T }).data
}

export const adminApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data ?? {}) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data instanceof FormData ? data : JSON.stringify(data ?? {}) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export function errMsg(e: unknown): string {
  if (e instanceof ApiClientError) return e.message
  if (e instanceof Error) return e.message
  return '出错了'
}

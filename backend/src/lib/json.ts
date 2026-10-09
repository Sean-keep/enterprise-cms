/**
 * SQLite 的 Prisma 连接器没有 Json 列，JSON 是存成文本的。
 * 这两个函数是唯一的读写口 —— 别在 service 里散落 JSON.parse，
 * 否则某个字段存了个坏 JSON，整个接口就 500 了。
 */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

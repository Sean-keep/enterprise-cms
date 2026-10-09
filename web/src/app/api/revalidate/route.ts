import { revalidateTag, revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

/**
 * on-demand revalidate webhook。
 *
 * **这是正确性要求，不是优化项。** 公开页是 SSG/ISR，构建后就是静态的；
 * 没有这条链路就会「后台改了，官网不更新」。
 *
 * 调用方是 backend，用 shared secret 认证。secret 不对一律 401 ——
 * 这个接口能让整站缓存失效，等于一个「强制刷站」按钮，不能裸奔。
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'invalid secret' } },
      { status: 401 },
    )
  }

  let payload: { tags?: string[]; paths?: string[] } = {}
  try {
    payload = await request.json()
  } catch {
    /* 空 body 也接受 */
  }

  const tags = Array.isArray(payload.tags) ? payload.tags.filter((t) => typeof t === 'string') : []
  const paths = Array.isArray(payload.paths) ? payload.paths.filter((p) => typeof p === 'string') : []

  if (tags.length === 0 && paths.length === 0) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'tags 或 paths 至少给一个' } },
      { status: 400 },
    )
  }

  for (const tag of tags) revalidateTag(tag)
  for (const path of paths) revalidatePath(path)

  return NextResponse.json({ data: { revalidated: { tags, paths } } })
}

import { NextRequest, NextResponse } from 'next/server'

/**
 * 联系表单的同源入口。转发给后端，浏览器不用直连 API 域。
 *
 * 限流在后端做（按 IP），这里不重复 —— 两层限流容易互相踩，而真实来源 IP
 * 只有后端的 trustProxy 才拿得到。
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const base = (process.env.API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '')

  let res: Response
  try {
    res = await fetch(`${base}/api/public/contact`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
        'user-agent': request.headers.get('user-agent') ?? '',
      },
      body,
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'NETWORK_ERROR', message: '服务暂时不可用，请稍后重试' } },
      { status: 502 },
    )
  }

  const text = await res.text()
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  })
}

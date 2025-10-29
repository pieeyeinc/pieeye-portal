import { NextRequest, NextResponse } from 'next/server'

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (ConsentGate Diagnostics)',
        'accept': 'text/html,application/xhtml+xml'
      },
      redirect: 'follow',
      cache: 'no-store'
    })
    if (!res.ok) return null
    const text = await res.text()
    return text
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get('domain')?.trim()
  if (!domain) return NextResponse.json({ error: 'domain is required' }, { status: 400 })

  // Try https then http
  const candidates = [`https://${domain}`, `http://${domain}`]
  let html: string | null = null
  for (const base of candidates) {
    html = await fetchHtml(base)
    if (html) break
  }
  if (!html) return NextResponse.json({ ids: [], note: 'Unable to fetch site HTML' })

  // Find GTM container ids
  const ids = new Set<string>()
  const patterns = [
    /GTM-[A-Z0-9]+/g, // generic
    /[?&]id=(GTM-[A-Z0-9]+)/g, // query param
  ]
  for (const p of patterns) {
    let m: RegExpExecArray | null
    while ((m = p.exec(html)) !== null) {
      const id = (m[1] || m[0]).toUpperCase()
      if (/^GTM-[A-Z0-9]+$/.test(id)) ids.add(id)
    }
  }

  const list = Array.from(ids)
  return NextResponse.json({ ids: list, primary: list[0] || null })
}



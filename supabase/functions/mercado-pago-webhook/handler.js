import { resumirOrder, uuidValido } from '../checkout/modelo.js'

export async function assinaturaValida(req, segredo) {
  if (!segredo) return false
  const id = new URL(req.url).searchParams.get('data.id')
  const requestId = req.headers.get('x-request-id')
  const partes = Object.fromEntries((req.headers.get('x-signature') || '').split(',').map(p => p.trim().split('=')))
  if (!/^ORD[A-Z0-9]+$/i.test(id || '') || !requestId || requestId.length > 200 || !/^\d{10,13}$/.test(partes.ts || '') || !/^[a-f0-9]{64}$/i.test(partes.v1 || '')) return false
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const assinatura = Uint8Array.from(partes.v1.match(/../g), n => parseInt(n, 16))
  const mensagem = `id:${id.toLowerCase()};request-id:${requestId};ts:${partes.ts};`
  return crypto.subtle.verify('HMAC', chave, assinatura, new TextEncoder().encode(mensagem))
}
export function criarHandlerWebhook(deps) {
  return async req => {
    if (req.method !== 'POST') return new Response(null, { status: 405 })
    if (!deps.config.webhookSecret || !deps.config.token) return new Response(null, { status: 503 })
    try {
      if (!(await assinaturaValida(req, deps.config.webhookSecret))) return new Response(null, { status: 401 })
      const order = await deps.consultarOrder(new URL(req.url).searchParams.get('data.id'))
      if (!uuidValido(order.external_reference)) return new Response(null, { status: 200 })
      const sessao = await deps.buscarSessao(order.external_reference)
      if (!sessao) return new Response(null, { status: 200 })
      await deps.aplicar(sessao, resumirOrder(order, sessao, deps.config.sellerId))
      return new Response(null, { status: 200 })
    } catch { return new Response(null, { status: 503 }) }
  }
}

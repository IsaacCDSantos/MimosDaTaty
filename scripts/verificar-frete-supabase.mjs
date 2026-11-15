import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
const url = process.env.VITE_SUPABASE_URL?.trim()
const chave = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
if (!url || !chave) throw new Error('Configure as variáveis públicas do Supabase.')
const cliente = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) } })
const preflight = await fetch(url + '/functions/v1/calcular-frete', { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization, apikey, content-type' }, signal: AbortSignal.timeout(20000) })
assert.equal(preflight.status, 204)
const { error } = await cliente.functions.invoke('calcular-frete', { body: { cepDestino: '01001000', itens: [{ pecaId: '00000000-0000-4000-8000-000000000000', quantidade: 1 }] } })
assert.ok(error)
assert.equal(error.context.status, 401)
const body = await error.context.json()
assert.equal(body.codigo, 'LOGIN_NECESSARIO')
console.log(JSON.stringify({ funcao: 'calcular-frete', preflight: 'ok', bloqueioSemLogin: 'ok', pedidosCriados: 0, cotacaoReal: 'verificar pelo checkout autenticado' }))

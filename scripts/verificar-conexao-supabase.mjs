import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { criarServicoPecas } from '../src/servicos/pecas.js'

const url = process.env.VITE_SUPABASE_URL?.trim()
const chave = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
if (!url || !chave) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente.')
const cliente = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } })
const servico = criarServicoPecas({ cliente, urlSupabase: url })
const [categorias, pecas] = await Promise.all([servico.listarCategorias(), servico.listarPecas({ somenteVisiveis: true })])
assert.ok(categorias.every(categoria => categoria.id && categoria.nome))
assert.ok(pecas.every(peca => peca.visivel === true))
console.log(JSON.stringify({ conexao: 'ok', categorias: categorias.length, pecasVisiveis: pecas.length, modo: 'somente leitura com chave publica' }))

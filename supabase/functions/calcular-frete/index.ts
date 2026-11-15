import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { criarHandlerFrete } from './handler.js'
import { ErroFrete } from './modelo.js'
const token = Deno.env.get('SUPERFRETE_TOKEN')?.trim()
const contato = Deno.env.get('SUPERFRETE_CONTATO')?.trim()
const ambiente = Deno.env.get('SUPERFRETE_AMBIENTE') || 'sandbox'
const cepOrigem = (Deno.env.get('SUPERFRETE_CEP_ORIGEM') || '61940005').replace('-', '').trim()
const urlSupabase = Deno.env.get('SUPABASE_URL')!
const chavePublica = Deno.env.get('SUPABASE_ANON_KEY')!
const config = { cepOrigem, ambiente, services: '1,2,17', embalagem: { height: 10, width: 20, length: 30, weight: 1 }, configurado: Boolean(token && contato && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato) && ['sandbox', 'production'].includes(ambiente) && /^\d{8}$/.test(cepOrigem)) }
Deno.serve(criarHandlerFrete({
 config,
 async autenticar(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ')) return null
  const cliente = createClient(urlSupabase, chavePublica, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await cliente.auth.getUser()
  return error || !data.user ? null : { id: data.user.id, cliente }
 },
 async carregarPecas(ids: string[], usuario: { cliente: ReturnType<typeof createClient> }) {
  const { data, error } = await usuario.cliente.from('pecas').select('id,nome,preco_centavos,visivel,arquivada,tipo_disponibilidade,estoque_atual,prazo_producao_dias').in('id', ids).eq('visivel', true).eq('arquivada', false)
  if (error) throw new ErroFrete(503, 'CATALOGO_INDISPONIVEL', 'Não foi possível conferir as peças do carrinho. Tente novamente.')
  return data
 },
 async consultarFrete(payload: unknown) {
  const base = ambiente === 'production' ? 'https://api.superfrete.com' : 'https://sandbox.superfrete.com'
  let resposta: Response
  try { resposta = await fetch(base + '/api/v0/calculator', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'MimosDaTaty/1.0 (' + contato + ')', 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) }) }
  catch { throw new ErroFrete(503, 'FRETE_INDISPONIVEL', 'A transportadora não respondeu a tempo. Tente novamente.') }
  if (resposta.status === 401 || resposta.status === 403) throw new ErroFrete(503, 'FRETE_NAO_CONFIGURADO', 'A loja precisa conferir a configuração do frete. Tente novamente mais tarde.')
  if (!resposta.ok) throw new ErroFrete(502, 'FRETE_INDISPONIVEL', 'Não foi possível obter opções de envio para esses dados. Confira o CEP ou tente novamente.')
  try { return await resposta.json() } catch { throw new ErroFrete(502, 'RESPOSTA_INVALIDA', 'A transportadora não retornou uma cotação válida. Tente novamente.') }
 }
}))

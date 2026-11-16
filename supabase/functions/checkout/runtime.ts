import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { ErroCheckout } from './modelo.js'

const url = Deno.env.get('SUPABASE_URL')!
const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } })
export const config = { token: Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')?.trim(), publicKey: Deno.env.get('MERCADO_PAGO_PUBLIC_KEY')?.trim(), sellerId: Deno.env.get('MERCADO_PAGO_SELLER_ID')?.trim(), ambiente: Deno.env.get('MERCADO_PAGO_AMBIENTE') || 'sandbox', webhookSecret: Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET')?.trim() }

function erroBanco(erro: { message?: string } | null) {
  if (!erro) return
  const codigos: Record<string, string> = { TENTATIVA_DIFERENTE: 'Consulte o pagamento existente antes de iniciar outra tentativa.', LIMITE_TENTATIVAS: 'Você já possui tentativas em andamento. Consulte seus pagamentos antes de continuar.', PECA_INDISPONIVEL: 'Uma peça não está mais disponível. Atualize o carrinho.', ESTOQUE_INSUFICIENTE: 'Uma peça está reservada ou sem estoque suficiente. Atualize o carrinho.', VALOR_ALTERADO: 'Os valores foram atualizados. Calcule o frete novamente.', SESSAO_EXPIRADA: 'O tempo para iniciar este pagamento expirou. Prepare uma nova tentativa.' }
  const codigo = Object.keys(codigos).find(c => erro.message?.includes(c))
  throw new ErroCheckout(codigo ? 409 : 503, codigo || 'BANCO_INDISPONIVEL', codigo ? codigos[codigo] : 'Não foi possível registrar o pagamento agora.')
}
async function rpc(nome: string, valores: Record<string, unknown>) {
  const { data, error } = await admin.rpc(nome, valores)
  erroBanco(error)
  return data
}
function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return '[' + valor.map(canonico).join(',') + ']'
  if (valor && typeof valor === 'object') return '{' + Object.entries(valor).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k)+':'+canonico(v)).join(',') + '}'
  return JSON.stringify(valor)
}
async function mercadoPago(caminho: string, payload?: unknown, chave?: string) {
  let resposta: Response
  try {
    resposta = await fetch('https://api.mercadopago.com' + caminho, { method: payload ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json', ...(chave ? { 'X-Idempotency-Key': chave } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(15000) })
  } catch { throw new ErroCheckout(503, 'CONFIRMACAO_PENDENTE', 'O pagamento está em verificação. Consulte o resultado antes de tentar novamente.') }
  if (!resposta.ok) {
    const definitiva = resposta.status === 400 || resposta.status === 422
    const erro = Object.assign(new ErroCheckout(definitiva ? 422 : 503, definitiva ? 'PAGAMENTO_RECUSADO' : 'CONFIRMACAO_PENDENTE', definitiva ? 'O Mercado Pago não aceitou os dados desta tentativa. Confira os dados ou escolha outra forma de pagamento.' : 'O pagamento precisa de verificação. Consulte o resultado antes de tentar novamente.'), { definitiva })
    // Não devolver nem registrar o corpo do provedor, que pode conter dados sensíveis.
    await resposta.body?.cancel()
    throw erro
  }
  return resposta.json()
}
export const dependencias = {
  config,
  async autenticar(authorization: string | null) {
    const token = authorization?.match(/^Bearer (.+)$/i)?.[1]
    if (!token) return null
    const { data, error } = await auth.auth.getUser(token)
    return error ? null : data.user
  },
  async buscarSessao(id: string, usuario?: string) {
    let consulta = admin.from('checkout_sessoes').select('*').eq('id', id)
    if (usuario) consulta = consulta.eq('cliente_id', usuario)
    const { data, error } = await consulta.maybeSingle()
    erroBanco(error)
    return data
  },
  mesmaRequisicao: (sessao: { requisicao: unknown }, dados: unknown) => canonico(sessao.requisicao) === canonico(dados),
  async cotar(dados: { endereco: { cep: string }; itens: unknown }) {
    const resposta = await fetch(url + '/functions/v1/calcular-frete', { method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ cepDestino: dados.endereco.cep, itens: dados.itens }), signal: AbortSignal.timeout(18000) })
    if (!resposta.ok) { await resposta.body?.cancel(); throw new ErroCheckout(503, 'FRETE_INDISPONIVEL', 'Não foi possível confirmar o frete. Calcule novamente em instantes.') }
    return resposta.json()
  },
  preparar: (dados: unknown, usuario: { id: string; email: string }, _cotacao: unknown, frete: unknown) => rpc('preparar_checkout', { p_usuario: usuario.id, p_email: usuario.email, p_dados: dados, p_frete: frete }),
  iniciar: (sessao: { id: string }, parcelas: number) => rpc('iniciar_checkout', { p_id: sessao.id, p_parcelas: parcelas }),
  cancelar: (id: string) => rpc('cancelar_checkout_preparado', { p_id: id }),
  falhar: (id: string) => rpc('falhar_checkout', { p_id: id }),
  aplicar: (sessao: { id: string }, resumo: unknown) => rpc('aplicar_checkout', { p_id: sessao.id, p_resumo: resumo }),
  async buscarPedido(id: string) {
    const { data, error } = await admin.from('pedidos').select('cliente_email_snapshot,cliente_cpf_snapshot,entrega_uf').eq('id', id).single()
    erroBanco(error)
    return data
  },
  criarOrder: (payload: unknown, chave: string) => mercadoPago('/v1/orders', payload, chave),
  consultarOrder: (id: string) => mercadoPago('/v1/orders/' + encodeURIComponent(id)),
}

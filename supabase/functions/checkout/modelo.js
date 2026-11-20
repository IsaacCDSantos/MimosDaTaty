import { validarPedido } from '../calcular-frete/modelo.js'

export class ErroCheckout extends Error {
  constructor(status, codigo, mensagem) { super(mensagem); this.status = status; this.codigo = codigo }
}
export const uuidValido = valor => typeof valor === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '))
function texto(valor, campo, minimo = 2, maximo = 150) {
  if (typeof valor !== 'string' || valor.trim().length < minimo || valor.trim().length > maximo) throw new ErroCheckout(400, 'DADOS_INVALIDOS', `Confira o campo ${campo}.`)
  return valor.trim()
}
function personalizarItens(originais, normalizados, usuarioId, chave) {
  const porPeca = new Map()
  const caminhos = new Set()
  for (const item of originais) {
    const pecaId = item.pecaId.trim().toLowerCase()
    const extras = {}
    if (item.personalizacao !== undefined) {
      if (typeof item.personalizacao !== 'string' || Array.from(item.personalizacao).length > 1000) throw new ErroCheckout(400, 'PERSONALIZACAO_INVALIDA', 'A observação de cada peça deve ter até 1000 caracteres.')
      if (item.personalizacao.trim()) extras.personalizacao = item.personalizacao.trim()
    }
    if (item.referencias !== undefined) {
      if (!Array.isArray(item.referencias) || item.referencias.length > 6) throw new ErroCheckout(400, 'REFERENCIAS_INVALIDAS', 'Envie até seis fotos de referência por peça.')
      const referencias = item.referencias.map(ref => {
        const prefixo = `${usuarioId}/${chave}/${pecaId}/`
        if (!uuidValido(usuarioId) || !ref || typeof ref !== 'object' || Array.isArray(ref) || Object.keys(ref).some(k => !['caminho', 'nome'].includes(k)) || typeof ref.caminho !== 'string' || !ref.caminho.startsWith(prefixo) || !/^[a-f0-9]{64}\.(jpg|png|webp)$/.test(ref.caminho.slice(prefixo.length)) || typeof ref.nome !== 'string' || !ref.nome.trim() || Array.from(ref.nome).length > 120 || caminhos.has(ref.caminho)) throw new ErroCheckout(400, 'REFERENCIAS_INVALIDAS', 'Confira as fotos de referência de cada peça.')
        caminhos.add(ref.caminho)
        return { caminho: ref.caminho, nome: ref.nome.trim() }
      })
      if (referencias.length) extras.referencias = referencias
    }
    const anterior = porPeca.get(pecaId)
    if (anterior && (Object.keys(anterior).length || Object.keys(extras).length)) throw new ErroCheckout(400, 'ITEM_DUPLICADO', 'Mantenha uma única entrada para cada peça personalizada.')
    porPeca.set(pecaId, extras)
  }
  return normalizados.map(item => ({ ...item, ...porPeca.get(item.pecaId) }))
}
export function validarPreparacao(body, usuarioId) {
  if (!uuidValido(body?.chave)) throw new ErroCheckout(400, 'CHAVE_INVALIDA', 'Reabra o checkout para continuar.')
  const endereco = body.endereco || {}
  const pedido = validarPedido({ cepDestino: endereco.cep, itens: body.itens })
  const cpf = String(body.cpf || '').replace(/\D/g, '')
  if (!cpfValido(cpf)) throw new ErroCheckout(400, 'CPF_INVALIDO', 'Confira os onze números do CPF.')
  const telefone = String(body.telefone || '').replace(/\D/g, '')
  if (!/^\d{10,11}$/.test(telefone)) throw new ErroCheckout(400, 'TELEFONE_INVALIDO', 'Informe o telefone com DDD.')
  const uf = texto(endereco.uf, 'estado', 2, 2).toUpperCase()
  if (!UFS.has(uf)) throw new ErroCheckout(400, 'UF_INVALIDA', 'Selecione um estado válido.')
  if (!['pix', 'cartao_credito'].includes(body.metodo)) throw new ErroCheckout(400, 'METODO_INVALIDO', 'Escolha Pix ou cartão de crédito.')
  if (!Number.isSafeInteger(body.totalExibidoCentavos) || body.totalExibidoCentavos <= 0) throw new ErroCheckout(400, 'TOTAL_INVALIDO', 'Confira o resumo antes de pagar.')
  return {
    chave: body.chave.toLowerCase(), itens: personalizarItens(body.itens, pedido.itens, usuarioId, body.chave.toLowerCase()), metodo: body.metodo, cpf, telefone,
    servicoFrete: texto(body.servicoFrete, 'forma de envio', 1, 30), totalExibidoCentavos: body.totalExibidoCentavos,
    endereco: { nome: texto(endereco.nome, 'nome completo'), cep: pedido.cepDestino, logradouro: texto(endereco.logradouro, 'logradouro'), numero: texto(endereco.numero, 'número', 1, 20), complemento: texto(endereco.complemento || '', 'complemento', 0, 100), bairro: texto(endereco.bairro, 'bairro'), cidade: texto(endereco.cidade, 'cidade'), uf },
  }
}
export function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  for (const limite of [9, 10]) {
    let soma = 0
    for (let i = 0; i < limite; i++) soma += Number(cpf[i]) * (limite + 1 - i)
    if ((soma * 10 % 11 % 10) !== Number(cpf[limite])) return false
  }
  return true
}
export function montarOrder(sessao, pedido, pagamento = {}) {
  const valor = (sessao.total_centavos / 100).toFixed(2)
  let metodo = { id: 'pix', type: 'bank_transfer' }
  if (sessao.metodo === 'cartao_credito') {
    if (!/^[a-zA-Z0-9_-]{10,200}$/.test(pagamento.token || '') || !/^[a-z_]{2,40}$/.test(pagamento.paymentMethodId || '') || !Number.isInteger(pagamento.parcelas) || pagamento.parcelas < 1 || pagamento.parcelas > 12) throw new ErroCheckout(400, 'CARTAO_INVALIDO', 'Confira os dados do cartão e as parcelas.')
    metodo = { id: pagamento.paymentMethodId, type: 'credit_card', token: pagamento.token, installments: pagamento.parcelas }
  }
  return {
    type: 'online', processing_mode: 'automatic', total_amount: valor, external_reference: sessao.id,
    payer: { email: pedido.cliente_email_snapshot, identification: { type: 'CPF', number: pedido.cliente_cpf_snapshot } },
    config: { location: { state_id: 'BR-' + pedido.entrega_uf } },
    transactions: { payments: [{ amount: valor, payment_method: metodo, ...(sessao.metodo === 'pix' ? { expiration_time: 'PT30M' } : {}) }] },
  }
}
function centavos(valor) {
  if (typeof valor !== 'string' || !/^\d+(\.\d{1,2})?$/.test(valor)) return NaN
  return Math.round(Number(valor) * 100)
}
export function resumirOrder(order, sessao, sellerId) {
  const pagamento = order?.transactions?.payments?.[0]
  if (!/^ORD[A-Z0-9]+$/i.test(order?.id || '') || order.external_reference !== sessao.id || String(order.user_id) !== String(sellerId) || order.country_code !== 'BRA' || centavos(order.total_amount) !== sessao.total_centavos || order.transactions?.payments?.length !== 1 || centavos(pagamento?.amount) !== sessao.total_centavos || (order.live_mode !== undefined && order.live_mode !== (sessao.ambiente === 'production'))) throw new ErroCheckout(502, 'PAGAMENTO_DIVERGENTE', 'O pagamento precisa de verificação. Não tente pagar novamente.')
  const esperado = sessao.metodo === 'pix' ? 'bank_transfer' : 'credit_card'
  if (pagamento.payment_method?.type !== esperado) throw new ErroCheckout(502, 'METODO_DIVERGENTE', 'O meio de pagamento precisa de verificação.')
  if (order.currency_id && order.currency_id !== 'BRL') throw new ErroCheckout(502, 'MOEDA_DIVERGENTE', 'A moeda do pagamento precisa de verificação.')
  const status = pagamento.status || order.status
  let estado = 'pendente'
  if (status === 'processed' && ['accredited', 'partially_refunded'].includes(pagamento.status_detail)) estado = 'aprovado'
  else if (['refunded', 'charged_back'].includes(status)) estado = 'estornado'
  else if (['failed', 'rejected'].includes(status)) estado = 'recusado'
  else if (['canceled', 'cancelled'].includes(status)) estado = 'cancelado'
  else if (status === 'expired') estado = 'expirado'
  const metodo = pagamento.payment_method
  return { estado, orderId: order.id, statusProvedor: status, detalheProvedor: pagamento.status_detail || order.status_detail || '', pixCopiaCola: sessao.metodo === 'pix' && typeof metodo.qr_code === 'string' ? metodo.qr_code.slice(0, 5000) : null, pixQrBase64: sessao.metodo === 'pix' && typeof metodo.qr_code_base64 === 'string' && /^[A-Za-z0-9+/=]+$/.test(metodo.qr_code_base64) ? metodo.qr_code_base64.slice(0, 200000) : null }
}
export function respostaPublica(sessao) {
  const dados = sessao.requisicao
  return { sessaoId: sessao.id, pedidoId: sessao.pedido_id, numeroPedido: sessao.numero_pedido, estado: sessao.estado, metodo: sessao.metodo, totalCentavos: sessao.total_centavos, expiraEm: sessao.expira_em, ambiente: sessao.ambiente, ...(dados ? { formulario: { endereco: dados.endereco, cpf: dados.cpf, telefone: dados.telefone } } : {}), ...(sessao.resposta || {}) }
}

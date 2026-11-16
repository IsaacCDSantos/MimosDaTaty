import test from 'node:test'
import assert from 'node:assert/strict'
import { validarPreparacao, montarOrder, resumirOrder, respostaPublica, ErroCheckout } from '../supabase/functions/checkout/modelo.js'
import { criarHandlerCheckout } from '../supabase/functions/checkout/handler.js'
import { assinaturaValida, criarHandlerWebhook } from '../supabase/functions/mercado-pago-webhook/handler.js'
import { criarServicoCheckout, etapaDoCheckout } from '../src/servicos/checkoutModelo.js'

const id = '07df660c-e4b1-470b-9fef-b30e5ebcb7fe'
const pedido = { cliente_email_snapshot: 'comprador@example.test', cliente_cpf_snapshot: '12345678909', entrega_uf: 'CE' }
const dados = { chave: id, metodo: 'pix', cpf: '12345678909', telefone: '85999999999', itens: [{ pecaId: id, quantidade: 1 }], totalExibidoCentavos: 5000, servicoFrete: '1', endereco: { nome: 'Cliente Teste', cep: '61940005', logradouro: 'Rua de Teste', numero: '1', bairro: 'Centro', cidade: 'Maranguape', uf: 'CE' } }
const sessao = { id, pedido_id: id, numero_pedido: 2, cliente_id: 'cliente', ambiente: 'sandbox', metodo: 'pix', estado: 'preparado', total_centavos: 5000, requisicao: dados, expira_em: '2026-11-16T01:00:00Z' }
const order = { id: 'ORDTST0123456789', external_reference: id, user_id: '123', country_code: 'BRA', total_amount: '50.00', status: 'action_required', transactions: { payments: [{ amount: '50.00', status: 'action_required', status_detail: 'waiting_transfer', payment_method: { id: 'pix', type: 'bank_transfer', qr_code: 'PIX-TESTE', qr_code_base64: 'aGVsbG8=' } }] } }
const config = { token: 'credencial-privada-de-teste', publicKey: 'chave-publica-teste', sellerId: '123', ambiente: 'sandbox', webhookSecret: 'assinatura-local-teste' }
function req(body, headers = {}) { return new Request('https://loja.test/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer sessao-teste', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }) }
function deps(extra = {}) { return { config, autenticar: async () => ({ id: 'cliente', email: pedido.cliente_email_snapshot }), buscarSessao: async () => null, cotar: async () => ({ ambiente: 'sandbox', subtotalCentavos: 4000, opcoes: [{ id: '1', precoCentavos: 1000 }] }), preparar: async () => sessao, buscarPedido: async () => pedido, iniciar: async () => {}, criarOrder: async () => order, consultarOrder: async () => order, aplicar: async (s, resumo) => ({ ...s, estado: resumo.estado, resposta: resumo }), falhar: async () => {}, ...extra } }

test('preparação valida CPF, UF, limite de quantidade e não aceita valor fracionário em centavos', () => {
  assert.equal(validarPreparacao(dados).endereco.cep, '61940005')
  for (const alteracao of [{ cpf: '11111111111' }, { telefone: '123' }, { totalExibidoCentavos: 1.5 }, { endereco: { ...dados.endereco, uf: 'XX' } }, { itens: [{ pecaId: id, quantidade: 0 }] }]) assert.throws(() => validarPreparacao({ ...dados, ...alteracao }))
})
test('valor e recebedor da order vêm do pedido persistido; Pix não recebe token de cartão', () => {
  const payload = montarOrder(sessao, pedido, { total_amount: '0.01', token: 'injetado' })
  assert.equal(payload.total_amount, '50.00')
  assert.equal(payload.external_reference, id)
  assert.deepEqual(payload.transactions.payments[0].payment_method, { id: 'pix', type: 'bank_transfer' })
  assert.equal(payload.config.location.state_id, 'BR-CE')
})
test('cartão usa token e parcelas validados, sem PAN, validade ou CVV', () => {
  const s = { ...sessao, metodo: 'cartao_credito' }
  assert.throws(() => montarOrder(s, pedido, { token: '123' }))
  assert.throws(() => montarOrder(s, pedido, { token: 'token_de_teste', paymentMethodId: 'visa', parcelas: 13 }))
  const payload = montarOrder(s, pedido, { token: 'token_de_teste', paymentMethodId: 'visa', parcelas: 2 })
  assert.equal(payload.transactions.payments[0].payment_method.installments, 2)
  assert.doesNotMatch(JSON.stringify(payload), /card_number|security_code|expiration_date/)
})
test('resposta divergente em referência, total, país, vendedor, ambiente ou método nunca aprova pedido', () => {
  for (const alteracao of [{ external_reference: crypto.randomUUID() }, { total_amount: '0.01' }, { country_code: 'ARG' }, { user_id: 'outro' }, { live_mode: true }]) assert.throws(() => resumirOrder({ ...order, ...alteracao }, sessao, '123'))
  assert.throws(() => resumirOrder(order, { ...sessao, metodo: 'cartao_credito' }, '123'))
  assert.equal(resumirOrder(order, sessao, '123').estado, 'pendente')
  const aprovado = structuredClone(order)
  aprovado.transactions.payments[0].status = 'processed'; aprovado.transactions.payments[0].status_detail = 'accredited'
  assert.equal(resumirOrder(aprovado, sessao, '123').estado, 'aprovado')
})
test('usuário sem sessão e consulta de outra conta não chegam ao provedor', async () => {
  const semLogin = criarHandlerCheckout(deps({ autenticar: async () => null, cotar: async () => assert.fail() }))
  assert.equal((await semLogin(req({ acao: 'preparar', ...dados }))).status, 401)
  const outro = criarHandlerCheckout(deps({ buscarSessao: async (i, usuario) => { assert.equal(usuario, 'cliente'); return null }, consultarOrder: async () => assert.fail() }))
  assert.equal((await outro(req({ acao: 'consultar', sessaoId: id }))).status, 404)
})
test('total manipulado e frete de ambiente desconhecido são recusados antes de persistir ou cobrar', async () => {
  const h = criarHandlerCheckout(deps({ preparar: async () => assert.fail() }))
  assert.equal((await h(req({ acao: 'preparar', ...dados, totalExibidoCentavos: 1 }))).status, 409)
  const prod = criarHandlerCheckout(deps({ cotar: async () => ({ ambiente: 'desconhecido', subtotalCentavos: 4000, opcoes: [{ id: '1', precoCentavos: 1000 }] }), preparar: async () => assert.fail() }))
  assert.equal((await prod(req({ acao: 'preparar', ...dados }))).status, 409)
})
test('pagamento de teste aceita cotação real sem contratar frete nem habilitar cobranças reais', async () => {
  let preparou = false
  const h = criarHandlerCheckout(deps({ cotar: async () => ({ ambiente: 'production', subtotalCentavos: 4000, opcoes: [{ id: '1', precoCentavos: 1000 }] }), preparar: async () => { preparou = true; return sessao } }))
  const resposta = await h(req({ acao: 'preparar', ...dados }))
  assert.equal(resposta.status, 200)
  assert.equal(preparou, true)
  assert.equal((await resposta.json()).ambiente, 'sandbox')
})
test('repetição usa a mesma chave persistida e pagamento já registrado não cria outra order', async () => {
  const chaves = []
  const h = criarHandlerCheckout(deps({ buscarSessao: async () => sessao, criarOrder: async (_payload, chave) => { chaves.push(chave); return order } }))
  await h(req({ acao: 'pagar', sessaoId: id })); await h(req({ acao: 'pagar', sessaoId: id }))
  assert.deepEqual(chaves, [id, id])
  const pronto = criarHandlerCheckout(deps({ buscarSessao: async () => ({ ...sessao, order_id: order.id, estado: 'pendente' }), criarOrder: async () => assert.fail() }))
  assert.equal((await pronto(req({ acao: 'pagar', sessaoId: id }))).status, 200)
})
test('timeout preserva tentativa incerta; recusa definitiva libera a tentativa', async () => {
  let falhas = 0
  const criarOrder = async () => { throw new ErroCheckout(503, 'CONFIRMACAO_PENDENTE', 'Em verificação') }
  const h = criarHandlerCheckout(deps({ buscarSessao: async () => sessao, criarOrder, falhar: async () => falhas++ }))
  assert.equal((await h(req({ acao: 'pagar', sessaoId: id }))).status, 503)
  assert.equal(falhas, 0)
  const definitivo = criarHandlerCheckout(deps({ buscarSessao: async () => sessao, criarOrder: async () => { throw Object.assign(new ErroCheckout(422, 'RECUSADO', 'Recusado'), { definitiva: true }) }, falhar: async () => falhas++ }))
  assert.equal((await definitivo(req({ acao: 'pagar', sessaoId: id }))).status, 422)
  assert.equal(falhas, 1)
})
test('configuração pública não expõe Access Token e produção permanece bloqueada', async () => {
  const h = criarHandlerCheckout(deps())
  const r = await h(req({ acao: 'configuracao' }))
  assert.doesNotMatch(await r.text(), /credencial-privada|assinatura-local/)
  const prod = criarHandlerCheckout(deps({ config: { ...config, ambiente: 'production' }, autenticar: async () => assert.fail() }))
  assert.equal((await prod(req({ acao: 'preparar', ...dados }))).status, 503)
})
test('JSON malformado e corpo sem content-length acima do limite são recusados', async () => {
  const h = criarHandlerCheckout(deps())
  assert.equal((await h(req('{'))).status, 400)
  assert.equal((await h(req(JSON.stringify({ texto: 'x'.repeat(25000) })))).status, 413)
})
async function notificado(secret = config.webhookSecret, idOrder = order.id) {
  const ts = String(Date.now())
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const assinatura = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(`id:${idOrder.toLowerCase()};request-id:teste;ts:${ts};`))
  const hex = Array.from(new Uint8Array(assinatura), b => b.toString(16).padStart(2, '0')).join('')
  return new Request('https://loja.test/webhook?data.id=' + idOrder + '&type=order', { method: 'POST', headers: { 'x-request-id': 'teste', 'x-signature': `ts=${ts},v1=${hex}` }, body: '{"status":"processed"}' })
}
test('webhook valida HMAC, recusa segredo incorreto e consulta API em vez de confiar no body', async () => {
  assert.equal(await assinaturaValida(await notificado(), config.webhookSecret), true)
  assert.equal(await assinaturaValida(await notificado('errado'), config.webhookSecret), false)
  let consultas = 0
  const h = criarHandlerWebhook(deps({ buscarSessao: async () => sessao, consultarOrder: async () => { consultas++; return order }, aplicar: async (_s, resumo) => assert.equal(resumo.estado, 'pendente') }))
  assert.equal((await h(await notificado())).status, 200)
  assert.equal(consultas, 1)
  assert.equal((await h(await notificado('errado'))).status, 401)
  assert.equal(consultas, 1)
})
test('cliente não deixa o chamador sobrescrever a ação e esconde mensagens internas do gateway', async () => {
  const servico = criarServicoCheckout({ functions: { invoke: async (nome, { body }) => { assert.equal(nome, 'checkout'); assert.equal(body.acao, 'consultar'); return { data: { estado: 'pendente' } } } } })
  assert.equal((await servico('consultar', { acao: 'pagar' })).estado, 'pendente')
})

test('troca antes de gerar pagamento cancela só a preparação, sem acessar o provedor', async () => {
  let cancelamentos = 0
  const h = criarHandlerCheckout(deps({ buscarSessao: async () => sessao, cancelar: async valor => { assert.equal(valor, id); cancelamentos++ }, consultarOrder: async () => assert.fail() }))
  const r = await h(req({ acao: 'cancelar', sessaoId: id }))
  assert.equal(r.status, 200)
  assert.equal((await r.json()).cancelado, true)
  assert.equal(cancelamentos, 1)
})

const sessaoPix = { ...sessao, estado: 'pendente', order_id: order.id }
function orderNoEstado(estado, detalhe) {
  return { ...order, status: estado, transactions: { payments: [{ ...order.transactions.payments[0], status: estado, status_detail: detalhe }] } }
}

test('troca de Pix confirma cancelamento no provedor antes de liberar outro pagamento', async () => {
  let atual = order
  const chamadas = []
  const h = criarHandlerCheckout(deps({
    buscarSessao: async () => sessaoPix,
    consultarOrder: async () => { chamadas.push('consultar'); return atual },
    cancelarOrder: async (orderId, chave) => { assert.equal(orderId, order.id); assert.equal(chave, id + '-cancelar'); chamadas.push('cancelar-provedor'); atual = orderNoEstado('canceled', 'canceled_transaction') },
    aplicar: async (s, resumo) => { chamadas.push('persistir'); return { ...s, estado: resumo.estado, resposta: resumo } },
    cancelar: async () => { chamadas.push('encerrar-pedido') },
  }))
  const r = await h(req({ acao: 'cancelar', sessaoId: id }))
  const resultado = await r.json()
  assert.equal(r.status, 200)
  assert.equal(resultado.estado, 'cancelado')
  assert.equal(resultado.cancelado, true)
  assert.deepEqual(chamadas, ['consultar', 'cancelar-provedor', 'consultar', 'persistir', 'encerrar-pedido'])
})

test('Pix pago antes ou durante o cancelamento preserva aprovação e bloqueia nova tentativa', async () => {
  for (const pagoAntes of [true, false]) {
    let consultas = 0
    let cancelamentos = 0
    const h = criarHandlerCheckout(deps({
      buscarSessao: async () => sessaoPix,
      consultarOrder: async () => (++consultas > 1 || pagoAntes) ? orderNoEstado('processed', 'accredited') : order,
      cancelarOrder: async () => { cancelamentos++; throw new Error('Já pago') },
      cancelar: async () => assert.fail('Pedido aprovado não pode ser cancelado'),
    }))
    const r = await h(req({ acao: 'cancelar', sessaoId: id }))
    const resultado = await r.json()
    assert.equal(resultado.estado, 'aprovado')
    assert.equal(resultado.cancelado, false)
    assert.equal(cancelamentos, pagoAntes ? 0 : 1)
  }
})

test('cancelamento com timeout só libera a troca se a consulta confirmar o encerramento', async () => {
  for (const confirmado of [true, false]) {
    let consultas = 0
    let finalizados = 0
    const h = criarHandlerCheckout(deps({
      buscarSessao: async () => sessaoPix,
      consultarOrder: async () => ++consultas > 1 && confirmado ? orderNoEstado('canceled', 'canceled_transaction') : order,
      cancelarOrder: async () => { throw new Error('Timeout') },
      cancelar: async () => { finalizados++ },
    }))
    const r = await h(req({ acao: 'cancelar', sessaoId: id }))
    assert.equal(r.status, confirmado ? 200 : 503)
    assert.equal(finalizados, confirmado ? 1 : 0)
    if (!confirmado) assert.equal((await r.json()).codigo, 'CANCELAMENTO_PENDENTE')
  }
})

test('criação incerta e cartão em processamento não são liberados por cancelamento local', async () => {
  for (const s of [{ ...sessao, estado: 'processando' }, { ...sessaoPix, metodo: 'cartao_credito' }]) {
    const h = criarHandlerCheckout(deps({ buscarSessao: async () => s, cancelar: async () => assert.fail(), cancelarOrder: async () => assert.fail() }))
    assert.equal((await h(req({ acao: 'cancelar', sessaoId: id }))).status, 409)
  }
})

test('consulta concluída depois de um webhook aprovado não encerra pedido aprovado', async () => {
  const h = criarHandlerCheckout(deps({
    buscarSessao: async () => sessaoPix,
    consultarOrder: async () => orderNoEstado('canceled', 'canceled_transaction'),
    aplicar: async s => ({ ...s, estado: 'aprovado', resposta: { estado: 'aprovado' } }),
    cancelar: async () => assert.fail(),
  }))
  const r = await h(req({ acao: 'cancelar', sessaoId: id }))
  assert.equal((await r.json()).cancelado, false)
})

test('repetição de cancelamento encerrado é segura e não cancela pagamento aprovado', async () => {
  for (const estado of ['cancelado', 'aprovado']) {
    let finalizados = 0
    const h = criarHandlerCheckout(deps({ buscarSessao: async () => ({ ...sessaoPix, estado }), cancelar: async () => { finalizados++ }, consultarOrder: async () => assert.fail() }))
    for (let i = 0; i < 2; i++) assert.equal((await (await h(req({ acao: 'cancelar', sessaoId: id }))).json()).cancelado, estado === 'cancelado')
    assert.equal(finalizados, estado === 'cancelado' ? 2 : 0)
  }
})

test('recuperação inclui somente dados de formulário da própria sessão, sem token ou chave', () => {
  const resultado = respostaPublica({ ...sessao, requisicao: { ...dados, token: 'nao-expor', segredo: 'nao-expor' } })
  assert.deepEqual(resultado.formulario, { endereco: dados.endereco, cpf: dados.cpf, telefone: dados.telefone })
  assert.doesNotMatch(JSON.stringify(resultado), /nao-expor|chave/)
})

test('retorno ao checkout exige escolha explícita antes de abrir Pix ou retomar pagamento', () => {
  for (const estado of ['preparado', 'pendente', 'processando']) {
    const pagamento = { ...sessaoPix, estado }
    assert.equal(etapaDoCheckout(pagamento, true, true), 'verificando')
    assert.equal(etapaDoCheckout(pagamento, false, true), 'retomada')
    assert.equal(etapaDoCheckout(pagamento, false, false), 'pagamento')
  }
  assert.equal(etapaDoCheckout(null, true, false), 'verificando')
  assert.equal(etapaDoCheckout(null, false, false), 'formulario')
})

test('aprovação recebida durante a escolha de retomada mostra confirmação diretamente', () => {
  assert.equal(etapaDoCheckout({ ...sessaoPix, estado: 'aprovado' }, false, true), 'pagamento')
})

import { ErroCheckout, uuidValido, validarPreparacao, montarOrder, resumirOrder, respostaPublica } from './modelo.js'

export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
export const json = (dados, status = 200) => new Response(JSON.stringify(dados), { status, headers: cors })
export async function lerJson(req, limite = 512000) {
  if (!req.headers.get('content-type')?.includes('application/json')) throw new ErroCheckout(400, 'FORMATO_INVALIDO', 'Envie os dados no formato correto.')
  const leitor = req.body?.getReader()
  if (!leitor) throw new ErroCheckout(400, 'CORPO_INVALIDO', 'Os dados não foram enviados.')
  let bytes = 0
  let texto = ''
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { value, done } = await leitor.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > limite) { await leitor.cancel(); throw new ErroCheckout(413, 'CORPO_GRANDE', 'Os dados ultrapassam o tamanho permitido.') }
      texto += decoder.decode(value, { stream: true })
    }
    return JSON.parse(texto + decoder.decode())
  } catch (erro) { if (erro instanceof ErroCheckout) throw erro; throw new ErroCheckout(400, 'JSON_INVALIDO', 'Não foi possível ler os dados enviados.') }
  finally { leitor.releaseLock() }
}
async function cancelarPagamento(deps, sessao) {
  if (sessao.estado === 'preparado' && !sessao.order_id) {
    await deps.cancelar(sessao.id)
    return json({ ...respostaPublica({ ...sessao, estado: 'cancelado' }), cancelado: true })
  }
  if (['cancelado', 'recusado', 'expirado', 'estornado'].includes(sessao.estado)) {
    if (sessao.estado === 'cancelado') await deps.cancelar(sessao.id)
    return json({ ...respostaPublica(sessao), cancelado: true })
  }
  if (sessao.estado === 'aprovado') return json({ ...respostaPublica(sessao), cancelado: false })
  // Uma criação sem resposta pode já ter cobrado. Nunca liberar outra tentativa nesse caso.
  if (!sessao.order_id || sessao.metodo !== 'pix') throw new ErroCheckout(409, 'CANCELAMENTO_PENDENTE', 'O pagamento está em verificação. Consulte o resultado antes de trocar a forma de pagamento.')
  let order = await deps.consultarOrder(sessao.order_id)
  let resumo = resumirOrder(order, sessao, deps.config.sellerId)
  if (resumo.estado === 'pendente' && ['action_required', 'created'].includes(order.status)) {
    let falha
    try { await deps.cancelarOrder(sessao.order_id, sessao.id + '-cancelar') }
    catch (erro) { falha = erro }
    // Mesmo após timeout ou pagamento simultâneo, consultar o resultado autoritativo.
    order = await deps.consultarOrder(sessao.order_id)
    resumo = resumirOrder(order, sessao, deps.config.sellerId)
    if (resumo.estado === 'pendente' && falha) throw new ErroCheckout(503, 'CANCELAMENTO_PENDENTE', 'Não foi possível confirmar o cancelamento do Pix. Tente novamente antes de trocar a forma de pagamento.')
  }
  const atualizada = await deps.aplicar(sessao, resumo)
  const encerrado = ['cancelado', 'recusado', 'expirado', 'estornado'].includes(atualizada.estado)
  if (atualizada.estado === 'cancelado') await deps.cancelar(sessao.id)
  return json({ ...respostaPublica(atualizada), cancelado: encerrado })
}
export function criarHandlerCheckout(deps) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (req.method !== 'POST') return json({ mensagem: 'Use o checkout para continuar.' }, 405)
    try {
      const body = await lerJson(req)
      if (body?.acao === 'configuracao') return json({ configurado: Boolean(deps.config.token && deps.config.publicKey && deps.config.sellerId), publicKey: deps.config.publicKey || null, ambiente: deps.config.ambiente })
      if (!deps.config.token || !deps.config.publicKey || !deps.config.sellerId) throw new ErroCheckout(503, 'PAGAMENTO_NAO_CONFIGURADO', 'O pagamento está temporariamente indisponível.')
      // Esta entrega habilita somente testes; produção exige revisar frete e condições comerciais.
      if (deps.config.ambiente !== 'sandbox') throw new ErroCheckout(503, 'PRODUCAO_NAO_HABILITADA', 'A loja ainda está preparando os pagamentos.')
      const usuario = await deps.autenticar(req.headers.get('authorization'))
      if (!usuario?.id || !usuario.email) throw new ErroCheckout(401, 'LOGIN_NECESSARIO', 'Entre na sua conta para finalizar a compra.')
      if (body.acao === 'preparar') {
        const dados = validarPreparacao(body, usuario.id)
        const existente = await deps.buscarSessao(dados.chave, usuario.id)
        if (existente) {
          if (JSON.stringify(existente.requisicao) !== JSON.stringify(JSON.parse(JSON.stringify(dados)))) {
            // jsonb ordena chaves; a comparação canônica é realizada pelo banco na preparação.
            const igual = await deps.mesmaRequisicao(existente, dados)
            if (!igual) throw new ErroCheckout(409, 'TENTATIVA_DIFERENTE', 'Uma tentativa já existe. Consulte o pagamento antes de iniciar outra.')
          }
          return json(respostaPublica(existente))
        }
        const cotacao = await deps.cotar(dados)
        const opcao = cotacao.opcoes?.find(o => o.id === dados.servicoFrete)
        // Cotar frete não contrata uma entrega. Os ambientes de frete e pagamento são independentes.
        if (!opcao || !['sandbox', 'production'].includes(cotacao.ambiente)) throw new ErroCheckout(409, 'FRETE_INVALIDO', 'Calcule novamente e escolha uma opção de envio válida.')
        const total = cotacao.subtotalCentavos + opcao.precoCentavos
        if (total !== dados.totalExibidoCentavos) throw new ErroCheckout(409, 'VALOR_ALTERADO', 'Os valores foram atualizados. Calcule o frete novamente e confira o resumo.')
        const sessao = await deps.preparar(dados, usuario, cotacao, opcao)
        return json(respostaPublica(sessao))
      }
      if (!uuidValido(body.sessaoId)) throw new ErroCheckout(400, 'SESSAO_INVALIDA', 'A tentativa de pagamento é inválida.')
      const sessao = await deps.buscarSessao(body.sessaoId, usuario.id)
      if (!sessao) throw new ErroCheckout(404, 'NAO_ENCONTRADO', 'Pagamento não encontrado para esta conta.')
      if (body.acao === 'cancelar') return await cancelarPagamento(deps, sessao)
      if (body.acao === 'consultar') {
        if (sessao.order_id && !['estornado'].includes(sessao.estado)) {
          const order = await deps.consultarOrder(sessao.order_id)
          return json(respostaPublica(await deps.aplicar(sessao, resumirOrder(order, sessao, deps.config.sellerId))))
        }
        return json(respostaPublica(sessao))
      }
      if (body.acao !== 'pagar') throw new ErroCheckout(400, 'ACAO_INVALIDA', 'Operação de pagamento inválida.')
      if (sessao.order_id || !['preparado', 'processando'].includes(sessao.estado)) return json(respostaPublica(sessao))
      const pedido = await deps.buscarPedido(sessao.pedido_id)
      const payload = montarOrder(sessao, pedido, body.pagamento)
      await deps.iniciar(sessao, sessao.metodo === 'pix' ? 1 : body.pagamento.parcelas)
      // A mesma chave persistida é usada em toda repetição, inclusive após timeout do provedor.
      let order
      try { order = await deps.criarOrder(payload, sessao.id) }
      catch (erro) { if (erro.definitiva) await deps.falhar(sessao.id); throw erro }
      const resumo = resumirOrder(order, sessao, deps.config.sellerId)
      return json(respostaPublica(await deps.aplicar(sessao, resumo)))
    } catch (erro) {
      const conhecido = erro instanceof ErroCheckout || (erro.status && erro.codigo)
      return json({ codigo: conhecido ? erro.codigo : 'PAGAMENTO_INDISPONIVEL', mensagem: conhecido ? erro.message : 'Não foi possível confirmar a operação. Consulte o pagamento antes de tentar novamente.' }, conhecido ? erro.status : 503)
    }
  }
}

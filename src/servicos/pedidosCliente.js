import { normalizarReferenciasPedido } from './referenciasPedidoModelo.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIMITE_INTEIRO = 2147483647
const COLUNAS_PEDIDOS = [
  'id', 'numero_pedido', 'cliente_id', 'status_pedido', 'status_pagamento', 'forma_pagamento',
  'subtotal_centavos', 'frete_centavos', 'total_centavos', 'modalidade_frete', 'prazo_estimado_dias',
  'entrega_destinatario', 'entrega_cep', 'entrega_logradouro', 'entrega_numero', 'entrega_complemento',
  'entrega_bairro', 'entrega_cidade', 'entrega_uf', 'entrega_ponto_referencia', 'observacao_cliente',
  'codigo_rastreio', 'criado_em', 'pago_em', 'enviado_em', 'entregue_em', 'cancelado_em',
].join(',')
const COLUNAS_ITENS = 'id,pedido_id,nome_peca_snapshot,imagem_url_snapshot,preco_unitario_centavos,quantidade,prazo_producao_dias_snapshot,personalizacao,referencias'
const ROTULOS_PAGAMENTO = {
  pendente: 'Aguardando pagamento', aprovado: 'Pagamento aprovado', recusado: 'Pagamento recusado',
  cancelado: 'Pagamento cancelado', estornado: 'Pagamento estornado',
}
const FORMAS_PAGAMENTO = { pix: 'Pix', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito' }

function falha(mensagem, codigo) {
  return Object.assign(new Error(mensagem), { codigo })
}
function uuid(valor) {
  return typeof valor === 'string' && UUID.test(valor) ? valor.toLowerCase() : null
}
function texto(valor, padrao = '') { return typeof valor === 'string' ? valor.trim() : padrao }
function invalido() { return falha('Não foi possível conferir os dados dos pedidos. Atualize a lista para tentar novamente.', 'DADOS_PEDIDOS_INVALIDOS') }
function inteiro(valor, minimo = 0) {
  if (!Number.isSafeInteger(valor) || valor < minimo || valor > LIMITE_INTEIRO) throw invalido()
  return valor
}
function numeroPedido(valor) {
  if (typeof valor === 'number') {
    if (!Number.isSafeInteger(valor) || valor <= 0) throw invalido()
    return String(valor)
  }
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor) || BigInt(valor) > 9223372036854775807n) throw invalido()
  return valor
}
function dataOpcional(valor) {
  if (typeof valor !== 'string' || !valor || Number.isNaN(Date.parse(valor))) return null
  return new Date(valor).toISOString()
}

export const FILTROS_PEDIDOS_CLIENTE = Object.freeze([
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'pagamento_aprovado', rotulo: 'Pagamento aprovado' },
  { chave: 'em_producao', rotulo: 'Em produção' },
  { chave: 'enviado', rotulo: 'Enviado' },
  { chave: 'entregue', rotulo: 'Entregue' },
])

// O andamento logístico e a confirmação financeira são informações diferentes.
export function estadoPedidoCliente(statusPedido, statusPagamento) {
  if (statusPedido === 'cancelado') return { chave: 'cancelado', rotulo: 'Pedido cancelado', etapa: null, tom: 'neutro' }
  const etapas = { em_producao: 1, enviado: 2, entregue: 3 }
  const rotulos = { em_producao: 'Em produção', enviado: 'Enviado', entregue: 'Entregue' }
  if (Object.hasOwn(etapas, statusPedido)) {
    return {
      chave: statusPedido, rotulo: rotulos[statusPedido],
      etapa: statusPagamento === 'aprovado' ? etapas[statusPedido] : null,
      tom: statusPedido === 'entregue' ? 'sucesso' : 'andamento',
    }
  }
  if (statusPedido === 'novo' && Object.hasOwn(ROTULOS_PAGAMENTO, statusPagamento)) {
    const chave = statusPagamento === 'pendente' ? 'aguardando_pagamento' : 'pagamento_' + statusPagamento
    return {
      chave, rotulo: ROTULOS_PAGAMENTO[statusPagamento], etapa: statusPagamento === 'aprovado' ? 0 : null,
      tom: statusPagamento === 'aprovado' ? 'andamento' : statusPagamento === 'pendente' ? 'neutro' : 'alerta',
    }
  }
  return { chave: 'status_indisponivel', rotulo: 'Situação não informada', etapa: null, tom: 'neutro' }
}

export function imagemPedidoCliente(valor, urlSupabase) {
  if (typeof valor !== 'string' || !valor.trim() || valor.length > 2048) return null
  const imagem = valor.trim()
  // Compatibilidade com os três snapshots locais anteriores ao catálogo persistente.
  if (/^(?:\/src\/assets\/imagens\/|\/(?:[A-Za-z0-9_-]+\/)*assets\/|\.\/assets\/|assets\/)(?:kit_berco_florido_figma|manta_croche_bebe_figma|trocador_croche_figma)(?:-[A-Za-z0-9_-]+)?\.png$/.test(imagem)) return imagem
  try {
    const foto = new URL(imagem)
    const projeto = new URL(urlSupabase)
    const prefixo = '/storage/v1/object/public/pecas/'
    if (projeto.protocol !== 'https:' || projeto.username || projeto.password || projeto.search || projeto.hash || projeto.pathname !== '/') return null
    if (foto.protocol !== 'https:' || foto.origin !== projeto.origin || foto.username || foto.password || foto.search || foto.hash
      || !foto.pathname.startsWith(prefixo) || !/\.(?:png|jpe?g|webp|avif)$/i.test(foto.pathname)
      || /%(?:2f|5c|00)/i.test(foto.pathname) || foto.pathname.includes('\\')) return null
    return foto.href
  } catch { return null }
}

function mapearItem(item, urlSupabase) {
  if (!uuid(item?.id)) throw invalido()
  const quantidade = inteiro(item.quantidade, 1)
  const preco = inteiro(item.preco_unitario_centavos, 1)
  if (!Number.isSafeInteger(quantidade * preco)) throw invalido()
  return {
    id: uuid(item.id), nome: texto(item.nome_peca_snapshot, 'Peça artesanal') || 'Peça artesanal',
    imagem: imagemPedidoCliente(item.imagem_url_snapshot, urlSupabase), quantidade,
    personalizacao: texto(item.personalizacao), referencias: normalizarReferenciasPedido(item.referencias), precoUnitarioCentavos: preco,
    prazoProducaoDias: item.prazo_producao_dias_snapshot == null ? null : inteiro(item.prazo_producao_dias_snapshot),
  }
}

export function mapearPedidoCliente(row, itens = [], urlSupabase) {
  const dataCriacao = dataOpcional(row?.criado_em)
  if (!uuid(row?.id) || !dataCriacao || !Array.isArray(itens)) throw invalido()
  const subtotal = inteiro(row.subtotal_centavos, 1)
  const frete = inteiro(row.frete_centavos)
  const total = inteiro(row.total_centavos, 1)
  if (total > subtotal + frete) throw invalido()
  const itensNormalizados = itens.map(item => {
    if (uuid(item?.pedido_id) !== uuid(row.id)) throw invalido()
    return mapearItem(item, urlSupabase)
  })
  return {
    id: uuid(row.id), numero: numeroPedido(row.numero_pedido), dataCriacao,
    estado: estadoPedidoCliente(row.status_pedido, row.status_pagamento),
    statusPedido: texto(row.status_pedido), statusPagamento: texto(row.status_pagamento),
    pagamentoRotulo: Object.hasOwn(ROTULOS_PAGAMENTO, row.status_pagamento) ? ROTULOS_PAGAMENTO[row.status_pagamento] : 'Situação do pagamento não informada',
    itens: itensNormalizados, subtotalCentavos: subtotal, freteCentavos: frete,
    descontoCentavos: subtotal + frete - total, totalCentavos: total,
    formaPagamento: Object.hasOwn(FORMAS_PAGAMENTO, row.forma_pagamento) ? FORMAS_PAGAMENTO[row.forma_pagamento] : 'Não informada',
    codigoRastreio: texto(row.codigo_rastreio), modalidadeFrete: texto(row.modalidade_frete),
    prazoEstimadoDias: row.prazo_estimado_dias == null ? null : inteiro(row.prazo_estimado_dias, 1),
    observacaoCliente: texto(row.observacao_cliente),
    endereco: {
      destinatario: texto(row.entrega_destinatario), cep: texto(row.entrega_cep),
      logradouro: texto(row.entrega_logradouro), numero: texto(row.entrega_numero),
      complemento: texto(row.entrega_complemento), bairro: texto(row.entrega_bairro),
      cidade: texto(row.entrega_cidade), uf: texto(row.entrega_uf), referencia: texto(row.entrega_ponto_referencia),
    },
    datas: { pagoEm: dataOpcional(row.pago_em), enviadoEm: dataOpcional(row.enviado_em), entregueEm: dataOpcional(row.entregue_em), canceladoEm: dataOpcional(row.cancelado_em) },
  }
}

async function verificarConta(cliente, usuarioEsperado, signal) {
  signal?.throwIfAborted()
  if (!uuid(usuarioEsperado)) throw falha('Sua sessão mudou. Entre novamente para consultar seus pedidos.', 'SESSAO_ALTERADA')
  if (!cliente?.auth?.getUser || typeof cliente.from !== 'function') throw falha('O serviço de pedidos está indisponível no momento.', 'SERVICO_INDISPONIVEL')
  let resposta
  try { resposta = await cliente.auth.getUser() } catch {
    signal?.throwIfAborted()
    throw falha('Não foi possível verificar sua sessão. Confira a conexão e tente novamente.', 'SESSAO_INDISPONIVEL')
  }
  signal?.throwIfAborted()
  if (resposta?.error) {
    const erro = resposta.error
    if (erro.name === 'AuthRetryableFetchError' || erro.status === 0 || erro.status >= 500 || erro.code === 'request_timeout') {
      throw falha('Não foi possível verificar sua sessão. Confira a conexão e tente novamente.', 'SESSAO_INDISPONIVEL')
    }
    throw falha('Entre novamente na sua conta para consultar seus pedidos.', 'LOGIN_NECESSARIO')
  }
  const id = uuid(resposta?.data?.user?.id)
  if (!id) throw falha('Entre na sua conta para consultar seus pedidos.', 'LOGIN_NECESSARIO')
  if (id !== uuid(usuarioEsperado)) throw falha('Sua sessão mudou. Entre novamente para consultar seus pedidos.', 'SESSAO_ALTERADA')
  return id
}

async function lerLotes(criarConsulta, validarRegistro, signal) {
  const registros = []
  let cursor = null
  while (true) {
    signal?.throwIfAborted()
    let consulta = criarConsulta().order('id', { ascending: true }).limit(200)
    if (cursor) consulta = consulta.gt('id', cursor)
    if (signal) consulta = consulta.abortSignal(signal)
    const { data, error } = await consulta
    signal?.throwIfAborted()
    if (error) throw error
    if (!Array.isArray(data)) throw invalido()
    if (!data.length) return registros
    for (const registro of data) {
      const id = uuid(registro?.id)
      if (!id || (cursor && id <= cursor)) throw invalido()
      validarRegistro(registro)
      cursor = id
      registros.push(registro)
    }
  }
}

export async function carregarPedidosCliente(cliente, usuarioEsperado, signal) {
  const usuarioId = await verificarConta(cliente, usuarioEsperado, signal)
  try {
    const pedidos = await lerLotes(
      () => cliente.from('pedidos').select(COLUNAS_PEDIDOS).eq('cliente_id', usuarioId),
      pedido => { if (uuid(pedido.cliente_id) !== usuarioId) throw invalido() }, signal,
    )
    const itensPorPedido = new Map(pedidos.map(pedido => [uuid(pedido.id), []]))
    const idsItens = new Set()
    for (let inicio = 0; inicio < pedidos.length; inicio += 100) {
      const ids = pedidos.slice(inicio, inicio + 100).map(pedido => uuid(pedido.id))
      const permitidos = new Set(ids)
      const itens = await lerLotes(
        () => cliente.from('itens_pedido').select(COLUNAS_ITENS).in('pedido_id', ids),
        item => {
          if (!permitidos.has(uuid(item.pedido_id)) || idsItens.has(uuid(item.id))) throw invalido()
          idsItens.add(uuid(item.id))
        }, signal,
      )
      for (const item of itens) itensPorPedido.get(uuid(item.pedido_id)).push(item)
    }
    await verificarConta(cliente, usuarioEsperado, signal)
    return pedidos.map(pedido => mapearPedidoCliente(pedido, itensPorPedido.get(uuid(pedido.id)), cliente.supabaseUrl))
      .sort((a, b) => Date.parse(b.dataCriacao) - Date.parse(a.dataCriacao) || a.id.localeCompare(b.id))
  } catch (erro) {
    signal?.throwIfAborted()
    if (erro?.name === 'AbortError' || erro?.codigo === 'SESSAO_ALTERADA' || erro?.codigo === 'LOGIN_NECESSARIO' || erro?.codigo === 'SESSAO_INDISPONIVEL') throw erro
    if (erro?.codigo === 'DADOS_PEDIDOS_INVALIDOS') throw erro
    throw falha('Não foi possível carregar seus pedidos. Confira a conexão e tente novamente.', 'CONSULTA_PEDIDOS_INDISPONIVEL')
  }
}

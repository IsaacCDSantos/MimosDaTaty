import { STATUS_PEDIDO, obterBloqueioPagamento } from '../paginas/Admin/Pedidos/pedidosModelo.js'

const dataLoja = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
})

export function dataNaLoja(instante) {
  const data = new Date(instante)
  if (!instante || Number.isNaN(data.getTime())) throw new Error('A data do pedido é inválida.')
  const partes = Object.fromEntries(dataLoja.formatToParts(data).map(parte => [parte.type, parte.value]))
  return `${partes.year}-${partes.month}-${partes.day}`
}

const FORMAS_PAGAMENTO = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  boleto: 'Boleto bancário',
  dinheiro: 'Dinheiro',
}

function formatarFormaPagamento(valor) {
  if (!valor) return 'Não informada'
  return FORMAS_PAGAMENTO[valor] || valor
}

export function mapearPedidoSupabase(row) {
  const itens = Array.isArray(row.itens_pedido)
    ? row.itens_pedido.map((item) => {
        const nomeBase = item.nome_peca_snapshot || 'Peça'
        const nome = item.personalizacao
          ? `${nomeBase} (${item.personalizacao})`
          : nomeBase

        return {
          id: item.id,
          nome,
          imagem: item.imagem_url_snapshot || null,
          quantidade: Number(item.quantidade) || 1,
          precoUnitario: typeof item.preco_unitario_centavos === 'number'
            ? item.preco_unitario_centavos / 100
            : 0,
        }
      })
    : []

  const resumoItens = itens.length > 0
    ? itens.map((item) => `${item.quantidade}× ${item.nome}`).join(', ')
    : 'Sem itens'

  const dataIso = dataNaLoja(row.criado_em)

  const statusValido = STATUS_PEDIDO.some((opcao) => opcao.valor === row.status_pedido)
    ? row.status_pedido
    : 'novo'

  const freteCentavos = typeof row.frete_centavos === 'number' ? row.frete_centavos : 0
  const subtotalCentavos = typeof row.subtotal_centavos === 'number' ? row.subtotal_centavos : 0
  const totalCentavos = typeof row.total_centavos === 'number' ? row.total_centavos : 0
  const descontoCentavos = subtotalCentavos > 0 && totalCentavos > 0
    ? Math.max(0, subtotalCentavos + freteCentavos - totalCentavos)
    : 0

  return {
    uuid: row.id,
    atualizadoEm: row.atualizado_em,
    id: String(row.numero_pedido ?? row.id.slice(0, 8)),
    data: dataIso,
    status: statusValido,
    statusPagamento: row.status_pagamento ?? null,
    cliente: {
      nome: row.cliente_nome_snapshot || 'Cliente não informado',
      email: row.cliente_email_snapshot || 'Não informado',
      telefone: row.cliente_telefone_snapshot || 'Não informado',
    },
    endereco: {
      destinatario: row.entrega_destinatario || row.cliente_nome_snapshot || '',
      referencia: row.entrega_ponto_referencia || '',
      logradouro: row.entrega_logradouro || '',
      numero: row.entrega_numero || 'S/N',
      complemento: row.entrega_complemento || '',
      bairro: row.entrega_bairro || '',
      cidade: row.entrega_cidade || '',
      uf: row.entrega_uf || '',
      cep: row.entrega_cep || '',
    },
    itens,
    resumoItens,
    frete: freteCentavos / 100,
    desconto: descontoCentavos / 100,
    formaPagamento: formatarFormaPagamento(row.forma_pagamento),
    observacaoCliente: row.observacao_cliente || '',
    observacaoInterna: row.observacao_interna || '',
    codigoRastreio: row.codigo_rastreio || '',
  }
}

// Paginação por ID evita depender do limite da API e não desloca registros quando chegam novos pedidos.
async function lerLotes(criarConsulta, signal) {
  const registros = []
  let ultimoId
  while (true) {
    signal?.throwIfAborted()
    let consulta = criarConsulta().order('id', { ascending: true }).limit(200)
    if (ultimoId) consulta = consulta.gt('id', ultimoId)
    if (signal) consulta = consulta.abortSignal(signal)
    const { data, error } = await consulta
    if (error) throw new Error(`Não foi possível carregar os pedidos: ${error.message}`)
    if (!data?.length) return registros
    const proximoId = data.at(-1).id
    if (!proximoId || (ultimoId && proximoId <= ultimoId)) throw new Error('Não foi possível continuar o carregamento dos pedidos. Tente novamente.')
    registros.push(...data)
    ultimoId = proximoId
  }
}

export async function carregarPedidosAdmin(cliente, signal) {
  if (!cliente) throw new Error('Serviço do banco de dados não configurado.')
  const pedidos = await lerLotes(() => cliente.from('pedidos').select('*').neq('status_pedido', 'cancelado'), signal)
  const itensPorPedido = new Map()
  // Busca os itens separadamente para que o limite dos relacionamentos também não corte um pedido.
  for (let inicio = 0; inicio < pedidos.length; inicio += 100) {
    const ids = pedidos.slice(inicio, inicio + 100).map(pedido => pedido.id)
    const itens = await lerLotes(() => cliente.from('itens_pedido').select('*').in('pedido_id', ids), signal)
    for (const item of itens) {
      if (!itensPorPedido.has(item.pedido_id)) itensPorPedido.set(item.pedido_id, [])
      itensPorPedido.get(item.pedido_id).push(item)
    }
  }
  return pedidos
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em) || a.id.localeCompare(b.id))
    .map(pedido => mapearPedidoSupabase({ ...pedido, itens_pedido: itensPorPedido.get(pedido.id) || [] }))
}

export async function atualizarPedidoAdmin(cliente, pedido, payload) {
  if (!cliente || !pedido.uuid || !pedido.atualizadoEm) throw new Error('Recarregue os pedidos antes de salvar.')
  const bloqueio = obterBloqueioPagamento(pedido, payload.status_pedido)
  if (bloqueio) throw new Error(bloqueio)
  let consulta = cliente.from('pedidos').update(payload)
    .eq('id', pedido.uuid).eq('status_pedido', pedido.status).eq('atualizado_em', pedido.atualizadoEm)
  // A aprovação pode ter sido revogada por um webhook após a leitura da tela.
  if (payload.status_pedido !== pedido.status && ['em_producao', 'enviado', 'entregue'].includes(payload.status_pedido)) {
    consulta = consulta.eq('status_pagamento', 'aprovado')
  }
  const { data, error } = await consulta
    .select('id, status_pedido, status_pagamento, atualizado_em, codigo_rastreio, observacao_interna').maybeSingle()
  if (error) throw new Error(`Não foi possível confirmar a alteração: ${error.message}. Atualize a lista antes de repetir a operação.`)
  if (!data) throw new Error('O pedido não foi alterado. Ele pode ter sido atualizado ou cancelado em outra sessão, ou não estar mais acessível. Feche os detalhes e atualize a lista.')
  return {
    ...pedido, status: data.status_pedido, atualizadoEm: data.atualizado_em,
    statusPagamento: data.status_pagamento ?? null,
    codigoRastreio: data.codigo_rastreio || '', observacaoInterna: data.observacao_interna || '',
  }
}

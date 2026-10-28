export const STATUS_PEDIDO = [
  { valor: 'novo', rotulo: 'Novo' },
  { valor: 'em_producao', rotulo: 'Em produção' },
  { valor: 'enviado', rotulo: 'Enviado' },
  { valor: 'entregue', rotulo: 'Entregue' },
]

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dataBrasileira = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function validarPedido(pedido) {
  if (!pedido || typeof pedido !== 'object' || Array.isArray(pedido)) {
    throw new Error('O pedido informado é inválido.')
  }
}

function validarLista(pedidos) {
  if (!Array.isArray(pedidos)) {
    throw new Error('A lista de pedidos é inválida.')
  }
}

function indiceStatus(status) {
  const indice = STATUS_PEDIDO.findIndex(opcao => opcao.valor === status)
  if (indice === -1) throw new Error('O status do pedido é inválido.')
  return indice
}

function validarValor(valor, campo) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    throw new Error('Informe um valor válido para ' + campo + '.')
  }
  return Math.round((valor + Number.EPSILON) * 100)
}

function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/#/g, '')
    .toLowerCase()
    .trim()
}

function normalizarRastreio(codigo) {
  if (codigo === undefined || codigo === null) return ''
  if (typeof codigo !== 'string') {
    throw new Error('O código de rastreio deve ser informado como texto.')
  }
  return codigo.trim()
}

export function formatarMoeda(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new Error('Informe um valor monetário válido.')
  }
  return moeda.format(valor)
}

export function formatarData(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error('Informe uma data válida no formato ano-mês-dia.')
  }
  const data = new Date(iso + 'T00:00:00.000Z')
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso) {
    throw new Error('A data do pedido é inválida.')
  }
  return dataBrasileira.format(data)
}

export function calcularResumo(pedido) {
  validarPedido(pedido)
  if (!Array.isArray(pedido.itens)) {
    throw new Error('O pedido precisa ter uma lista de itens.')
  }
  const subtotalCentavos = pedido.itens.reduce((soma, item) => {
    if (!item || !Number.isInteger(item.quantidade) || item.quantidade < 1) {
      throw new Error('A quantidade de cada peça deve ser um número inteiro maior que zero.')
    }
    const precoUnitarioCentavos = validarValor(item.precoUnitario, 'o preço da peça')
    return soma + precoUnitarioCentavos * item.quantidade
  }, 0)
  const freteCentavos = validarValor(pedido.frete ?? 0, 'o frete')
  const descontoCentavos = validarValor(pedido.desconto ?? 0, 'o desconto')
  const totalCentavos = subtotalCentavos + freteCentavos - descontoCentavos
  if (totalCentavos < 0) {
    throw new Error('O desconto não pode ser maior que o subtotal somado ao frete.')
  }
  return {
    subtotal: subtotalCentavos / 100,
    frete: freteCentavos / 100,
    desconto: descontoCentavos / 100,
    total: totalCentavos / 100,
  }
}

export function filtrarPedidos(pedidos, { status = 'todos', busca = '' } = {}) {
  validarLista(pedidos)
  if (status !== 'todos') indiceStatus(status)
  const termos = normalizarTexto(busca).split(/\s+/).filter(Boolean)
  return pedidos.filter(pedido => {
    const correspondeStatus = status === 'todos' || pedido.status === status
    const textoPedido = normalizarTexto((pedido.cliente?.nome ?? '') + ' ' + pedido.id)
    return correspondeStatus && termos.every(termo => textoPedido.includes(termo))
  })
}

export function contarStatus(pedidos) {
  validarLista(pedidos)
  return pedidos.reduce((contagens, pedido) => {
    indiceStatus(pedido.status)
    contagens[pedido.status] += 1
    return contagens
  }, { novo: 0, em_producao: 0, enviado: 0, entregue: 0 })
}

export function mudarStatus(pedido, destino, codigoRastreio = pedido?.codigoRastreio) {
  validarPedido(pedido)
  const origem = indiceStatus(pedido.status)
  const proximo = indiceStatus(destino)
  if (Math.abs(proximo - origem) !== 1) {
    throw new Error('O status só pode avançar ou voltar uma etapa por vez.')
  }
  const codigo = normalizarRastreio(codigoRastreio)
  if (destino === 'enviado' && !codigo) {
    throw new Error('Informe o código de rastreio para marcar o pedido como enviado.')
  }
  return { ...pedido, status: destino, codigoRastreio: codigo }
}

export function salvarObservacao(pedido, texto) {
  validarPedido(pedido)
  if (typeof texto !== 'string') {
    throw new Error('A observação interna deve ser informada como texto.')
  }
  return { ...pedido, observacaoInterna: texto.trim() }
}

export function salvarRastreio(pedido, codigo) {
  validarPedido(pedido)
  if (pedido.status !== 'enviado') {
    throw new Error('O código de rastreio só pode ser alterado em pedidos enviados.')
  }
  const codigoRastreio = normalizarRastreio(codigo)
  if (!codigoRastreio) {
    throw new Error('Informe um código de rastreio antes de salvar.')
  }
  return { ...pedido, codigoRastreio }
}

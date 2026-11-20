export const CHAVE_CARRINHO = 'mimos-carrinho-v1'

function normalizarImagensReferencia(lista) {
  if (!Array.isArray(lista)) return []
  return lista.slice(0, 6).flatMap((img) => {
    if (!img || typeof img !== 'object') return []
    const id = typeof img.id === 'string' && img.id.trim() ? img.id.trim().slice(0, 60) : ''
    const nome = typeof img.nome === 'string' ? img.nome.trim().slice(0, 120) : ''
    const dataUrl =
      typeof img.dataUrl === 'string' &&
      /^data:image\/(jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(img.dataUrl) &&
      img.dataUrl.length <= 350000
        ? img.dataUrl
        : ''
    if (!nome && !dataUrl) return []
    return [{ id: id || nome, nome: nome || 'Referência', dataUrl }]
  })
}

export function normalizarItens(valor) {
  if (!Array.isArray(valor)) return []
  const vistos = new Set()
  return valor.slice(0, 30).flatMap((item) => {
    if (!item || !['string', 'number'].includes(typeof item.id)) return []
    const id = String(item.id)
    const precoCentavos = item.precoCentavos
    if (
      !id ||
      id.length > 100 ||
      vistos.has(id) ||
      !Number.isSafeInteger(precoCentavos) ||
      precoCentavos <= 0 ||
      precoCentavos > 2147483647 ||
      !Number.isInteger(item.quantidade) ||
      item.quantidade < 1 ||
      item.quantidade > 50
    ) {
      return []
    }
    vistos.add(id)
    const observacoes = typeof item.observacoes === 'string' ? item.observacoes.trim().slice(0, 1000) : ''
    const imagensReferencia = normalizarImagensReferencia(item.imagensReferencia)
    return [
      {
        id,
        nome: String(item.nome || 'Peça').slice(0, 120),
        descricao: String(item.descricao || '').slice(0, 2000),
        imagem: String(item.imagem || '').slice(0, 2000),
        prazo: String(item.prazo || '').slice(0, 100),
        precoCentavos,
        preco: precoCentavos / 100,
        quantidade: item.quantidade,
        limite: Number.isInteger(item.limite) && item.limite >= 0 ? Math.min(50, item.limite) : 50,
        ...(observacoes ? { observacoes } : {}),
        ...(imagensReferencia.length > 0 ? { imagensReferencia } : {}),
      },
    ]
  })
}

export function subtotalDoCarrinho(itens) {
  return itens.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0)
}

export function chaveDoCarrinho(itens) {
  return itens
    .map((i) => i.id + ':' + i.quantidade + ':' + i.precoCentavos)
    .sort()
    .join('|')
}

export function adicionarItem(itens, produto) {
  const limite = produto.tipoDisponibilidade === 'pronta_entrega' ? Math.min(50, Number(produto.estoque)) : 50
  const atual = itens.find((i) => i.id === String(produto.id))
  const quantidade = Number(produto.quantidade) + (atual?.quantidade || 0)
  if (!Number.isInteger(limite) || limite < 1 || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > limite) {
    throw new Error('A quantidade ultrapassa o estoque disponível ou o limite de 50 unidades.')
  }
  if (!atual && itens.length >= 30) throw new Error('O carrinho aceita até 30 peças diferentes.')

  const observacoes =
    typeof produto.observacoes === 'string' && produto.observacoes.trim()
      ? produto.observacoes.trim()
      : atual?.observacoes || ''
  const imagensReferencia =
    Array.isArray(produto.imagensReferencia) && produto.imagensReferencia.length > 0
      ? produto.imagensReferencia
      : atual?.imagensReferencia || []

  const [item] = normalizarItens([
    {
      ...produto,
      id: String(produto.id),
      precoCentavos: Math.round(produto.preco * 100),
      quantidade,
      limite,
      observacoes,
      imagensReferencia,
    },
  ])
  if (!item) throw new Error('Não foi possível adicionar essa peça. Atualize o catálogo.')
  return atual ? itens.map((i) => (i.id === item.id ? item : i)) : [...itens, item]
}

// Retira só o que foi pago: peças adicionadas depois da preparação continuam no carrinho.
export function descontarItensPagos(itens, pagos) {
  const restante = new Map()
  for (const pago of Array.isArray(pagos) ? pagos : []) {
    const quantidade = Number(pago?.quantidade)
    if (typeof pago?.pecaId === 'string' && Number.isInteger(quantidade) && quantidade > 0) {
      restante.set(pago.pecaId, (restante.get(pago.pecaId) || 0) + quantidade)
    }
  }
  return itens.flatMap((i) => {
    const quantidade = i.quantidade - (restante.get(i.id) || 0)
    return quantidade > 0 ? [{ ...i, quantidade }] : []
  })
}

export function mudarQuantidade(itens, id, delta) {
  return itens.flatMap((i) => {
    if (i.id !== id) return [i]
    const quantidade = i.quantidade + delta
    if (quantidade <= 0) return []
    return [{ ...i, quantidade: Math.min(quantidade, Math.max(i.limite, i.quantidade), 50) }]
  })
}

export const CHAVE_CARRINHO = 'mimos-carrinho-v1'
export function normalizarItens(valor) {
  if (!Array.isArray(valor)) return []
  const vistos = new Set()
  return valor.slice(0, 30).flatMap(item => {
    if (!item || !['string', 'number'].includes(typeof item.id)) return []
    const id = String(item.id)
    const precoCentavos = item.precoCentavos
    if (!id || id.length > 100 || vistos.has(id) || !Number.isSafeInteger(precoCentavos) || precoCentavos <= 0 || precoCentavos > 2147483647 || !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 50) return []
    vistos.add(id)
    return [{ id, nome: String(item.nome || 'Peça').slice(0, 120), descricao: String(item.descricao || '').slice(0, 2000), imagem: String(item.imagem || '').slice(0, 2000), prazo: String(item.prazo || '').slice(0, 100), precoCentavos, preco: precoCentavos / 100, quantidade: item.quantidade, limite: Number.isInteger(item.limite) && item.limite >= 0 ? Math.min(50, item.limite) : 50 }]
  })
}
export function subtotalDoCarrinho(itens) { return itens.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0) }
export function chaveDoCarrinho(itens) { return itens.map(i => i.id + ':' + i.quantidade + ':' + i.precoCentavos).sort().join('|') }
export function adicionarItem(itens, produto) {
  const limite = produto.tipoDisponibilidade === 'pronta_entrega' ? Math.min(50, Number(produto.estoque)) : 50
  const atual = itens.find(i => i.id === String(produto.id))
  const quantidade = Number(produto.quantidade) + (atual?.quantidade || 0)
  if (!Number.isInteger(limite) || limite < 1 || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > limite) throw new Error('A quantidade ultrapassa o estoque disponível ou o limite de 50 unidades.')
  if (!atual && itens.length >= 30) throw new Error('O carrinho aceita até 30 peças diferentes.')
  const [item] = normalizarItens([{ ...produto, id: String(produto.id), precoCentavos: Math.round(produto.preco * 100), quantidade, limite }])
  if (!item) throw new Error('Não foi possível adicionar essa peça. Atualize o catálogo.')
  return atual ? itens.map(i => i.id === item.id ? item : i) : [...itens, item]
}
export function mudarQuantidade(itens, id, delta) {
  return itens.flatMap(i => {
    if (i.id !== id) return [i]
    const quantidade = i.quantidade + delta
    if (quantidade <= 0) return []
    return [{ ...i, quantidade: Math.min(quantidade, Math.max(i.limite, i.quantidade), 50) }]
  })
}

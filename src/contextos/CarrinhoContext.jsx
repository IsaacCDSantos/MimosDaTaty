import { useState } from 'react'
import { CarrinhoContext } from './carrinhoBase'
import { ITENS_PADRAO } from './carrinhoDados'

export function CarrinhoProvider({ children }) {
  // Estado puramente em memória (sem persistência)
  const [itens, setItens] = useState(ITENS_PADRAO)

  const subtotal = itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0)
  const frete = itens.length > 0 ? 25.0 : 0.0
  const desconto = 0.0
  const total = itens.length > 0 ? subtotal + frete - desconto : 0.0
  const quantidadeTotal = itens.reduce((acc, item) => acc + item.quantidade, 0)

  const alterarQuantidade = (id, delta) => {
    setItens((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const novaQtd = item.quantidade + delta
            return novaQtd > 0 ? { ...item, quantidade: novaQtd } : null
          }
          return item
        })
        .filter(Boolean)
    )
  }

  const removerItem = (id) => {
    setItens((prev) => prev.filter((item) => item.id !== id))
  }

  const limparCarrinho = () => {
    setItens([])
  }

  const restaurarItensPadrao = () => {
    setItens(ITENS_PADRAO)
  }

  const adicionarItem = (novoItem) => {
    setItens((prev) => {
      const existente = prev.find((i) => i.id === novoItem.id)
      if (existente) {
        return prev.map((i) =>
          i.id === novoItem.id ? { ...i, quantidade: i.quantidade + (novoItem.quantidade || 1) } : i
        )
      }
      return [...prev, { ...novoItem, quantidade: novoItem.quantidade || 1 }]
    })
  }

  return (
    <CarrinhoContext.Provider
      value={{
        itens,
        subtotal,
        frete,
        desconto,
        total,
        quantidadeTotal,
        alterarQuantidade,
        removerItem,
        limparCarrinho,
        restaurarItensPadrao,
        adicionarItem,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  )
}

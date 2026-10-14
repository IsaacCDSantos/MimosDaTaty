import { useState, useEffect } from 'react'
import { CarrinhoContext } from './carrinhoBase'
import { ITENS_PADRAO } from './carrinhoDados'
import kitBercoImg from '../assets/imagens/kit_berco_florido_figma.png'
import mantaCrocheImg from '../assets/imagens/manta_croche_bebe_figma.png'
import trocadorCrocheImg from '../assets/imagens/trocador_croche_figma.png'

export function CarrinhoProvider({ children }) {
  const [itens, setItens] = useState(() => {
    try {
      const salvo = localStorage.getItem('@mimos-taty:carrinho')
      if (salvo) {
        const parsed = JSON.parse(salvo)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => {
            if (item.id === 'kit-berco-florido') return { ...item, imagem: kitBercoImg }
            if (item.id === 'manta-croche-bebe') return { ...item, imagem: mantaCrocheImg }
            if (item.id === 'trocador-croche') return { ...item, imagem: trocadorCrocheImg }
            return item
          })
        }
      }
    } catch {
      // Ignora erro de JSON e usa os padrões
    }
    return ITENS_PADRAO
  })

  useEffect(() => {
    try {
      localStorage.setItem('@mimos-taty:carrinho', JSON.stringify(itens))
    } catch {
      // Ignora erro em caso de bloqueio de armazenamento
    }
  }, [itens])

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

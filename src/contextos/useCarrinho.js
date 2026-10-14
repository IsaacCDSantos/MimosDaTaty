import { useContext } from 'react'
import { CarrinhoContext } from './carrinhoBase'

export function useCarrinho() {
  const context = useContext(CarrinhoContext)
  if (!context) {
    throw new Error('useCarrinho deve ser utilizado dentro de um CarrinhoProvider')
  }
  return context
}

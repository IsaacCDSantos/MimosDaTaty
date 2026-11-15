import { useContext } from 'react'
import { CarrinhoContexto } from './contexto'
export function useCarrinho() {
 const contexto = useContext(CarrinhoContexto)
 if (!contexto) throw new Error('Carrinho indisponível.')
 return contexto
}

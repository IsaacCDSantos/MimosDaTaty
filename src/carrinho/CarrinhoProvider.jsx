import { useEffect, useRef, useState } from 'react'
import { CarrinhoContexto } from './contexto'
import { CHAVE_CARRINHO, normalizarItens, adicionarItem, mudarQuantidade, subtotalDoCarrinho } from './modelo'
function lerCarrinho() { try { return normalizarItens(JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || '[]')) } catch { return [] } }
export default function CarrinhoProvider({ children }) {
 const [itens, setItens] = useState(lerCarrinho)
 const atuais = useRef(itens)
 function atualizar(proximos) { atuais.current = proximos; setItens(proximos) }
 useEffect(() => { try { localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens)) } catch { /* O carrinho continua disponível nesta aba. */ } }, [itens])
 useEffect(() => { const sincronizar = evento => { if (evento.key === CHAVE_CARRINHO || evento.key === null) { const novos = lerCarrinho(); atuais.current = novos; setItens(novos) } }; window.addEventListener('storage', sincronizar); return () => window.removeEventListener('storage', sincronizar) }, [])
 const valor = { itens, subtotalCentavos: subtotalDoCarrinho(itens), adicionar: p => atualizar(adicionarItem(atuais.current, p)), alterarQuantidade: (id, delta) => atualizar(mudarQuantidade(atuais.current, id, delta)), remover: id => atualizar(atuais.current.filter(i => i.id !== id)) }
 return <CarrinhoContexto.Provider value={valor}>{children}</CarrinhoContexto.Provider>
}

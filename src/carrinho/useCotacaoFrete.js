import { useEffect, useMemo, useRef, useState } from 'react'
import { calcularFrete } from '../servicos/frete'
import { estadoDaCotacao } from '../servicos/freteModelo'
import { chaveDoCarrinho } from './modelo'
export function useCotacaoFrete(itens, cep) {
 const chave = cep + '|' + chaveDoCarrinho(itens)
 // Uma nova visita ao mesmo CEP/carrinho não recupera a seleção de uma visita anterior.
 const vinculo = useMemo(() => ({ chave }), [chave])
 const [estado, setEstado] = useState(null)
 const [agora, setAgora] = useState(Date.now)
 const [escolha, setEscolha] = useState(null)
 const requisicao = useRef(0)
 useEffect(() => () => { requisicao.current += 1 }, [vinculo])
 useEffect(() => {
  if (estado?.situacao !== 'pronto') return
  const atualizarRelogio = () => setAgora(Date.now())
  const tempo = Math.max(0, Date.parse(estado.cotacao.expiraEm) - Date.now())
  const t = setTimeout(atualizarRelogio, tempo)
  window.addEventListener('focus', atualizarRelogio)
  document.addEventListener('visibilitychange', atualizarRelogio)
  return () => { clearTimeout(t); window.removeEventListener('focus', atualizarRelogio); document.removeEventListener('visibilitychange', atualizarRelogio) }
 }, [estado])
 const atual = estadoDaCotacao(estado, vinculo, agora)
 const selecionada = atual.situacao === 'pronto' && escolha?.chave === vinculo ? atual.cotacao.opcoes.find(o => o.id === escolha.id) : null
 async function calcular() {
  const numero = ++requisicao.current
  setEscolha(null)
  setEstado({ situacao: 'carregando', chave: vinculo })
  try { const cotacao = await calcularFrete({ cepDestino: cep, itens }); if (numero === requisicao.current) { setAgora(Date.now()); setEstado({ situacao: 'pronto', chave: vinculo, cotacao }) } }
  catch (erro) { if (numero === requisicao.current) setEstado({ situacao: 'erro', chave: vinculo, mensagem: erro.message, codigo: erro.codigo }) }
 }
 return { ...atual, selecionada, calcular, selecionar: id => {
  const momento = Date.now()
  setAgora(momento)
  if (estadoDaCotacao(estado, vinculo, momento).situacao === 'pronto') setEscolha({ id, chave: vinculo })
 } }
}

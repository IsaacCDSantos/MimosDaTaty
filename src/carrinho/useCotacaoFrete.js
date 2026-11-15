import { useEffect, useRef, useState } from 'react'
import { calcularFrete } from '../servicos/frete'
import { estadoDaCotacao } from '../servicos/freteModelo'
import { chaveDoCarrinho } from './modelo'
export function useCotacaoFrete(itens, cep) {
 const chave = cep + '|' + chaveDoCarrinho(itens)
 const [estado, setEstado] = useState(null)
 const [agora, setAgora] = useState(Date.now)
 const [escolha, setEscolha] = useState(null)
 const requisicao = useRef(0)
 useEffect(() => () => { requisicao.current += 1 }, [chave])
 useEffect(() => { if (estado?.situacao !== 'pronto') return; const tempo = Math.max(0, Date.parse(estado.cotacao.expiraEm) - Date.now()); const t = setTimeout(() => setAgora(Date.now()), tempo); return () => clearTimeout(t) }, [estado])
 const atual = estadoDaCotacao(estado, chave, agora)
 const selecionada = atual.situacao === 'pronto' && escolha?.chave === chave ? atual.cotacao.opcoes.find(o => o.id === escolha.id) : null
 async function calcular() {
  const numero = ++requisicao.current
  setEscolha(null)
  setEstado({ situacao: 'carregando', chave })
  try { const cotacao = await calcularFrete({ cepDestino: cep, itens }); if (numero === requisicao.current) { setAgora(Date.now()); setEstado({ situacao: 'pronto', chave, cotacao }) } }
  catch (erro) { if (numero === requisicao.current) setEstado({ situacao: 'erro', chave, mensagem: erro.message, codigo: erro.codigo }) }
 }
 return { ...atual, selecionada, calcular, selecionar: id => setEscolha({ id, chave }) }
}

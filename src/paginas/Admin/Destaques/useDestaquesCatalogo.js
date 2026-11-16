import { useEffect, useState } from 'react'
import { servicoVisualizacoes } from '../../../servicos/destaques'

export function useDestaquesCatalogo({ limite } = {}) {
  const [revisao, setRevisao] = useState(0)
  const [estado, setEstado] = useState({ destaques: [], carregando: true, erro: '' })

  useEffect(() => {
    let ativo = true
    servicoVisualizacoes.listarDestaques(limite == null ? {} : { limite })
      .then(destaques => {
        if (ativo) setEstado({ destaques, carregando: false, erro: '' })
      })
      .catch(() => {
        if (ativo) setEstado({ destaques: [], carregando: false, erro: 'Não foi possível carregar os destaques. Tente novamente.' })
      })
    return () => { ativo = false }
  }, [limite, revisao])

  function recarregar() {
    setEstado({ destaques: [], carregando: true, erro: '' })
    setRevisao(valor => valor + 1)
  }

  return { ...estado, recarregar }
}

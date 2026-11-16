import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { CatalogoAdminContext } from './catalogoContext'
import { servicoPecas } from '../../../servicos/catalogo'

export default function CatalogoPersistenteProvider() {
  const [revisao, setRevisao] = useState(0)
  const [estado, setEstado] = useState({ pecas: [], categorias: [], carregando: true, erro: '' })
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')
  const [erroAcao, setErroAcao] = useState('')
  const operacaoPendente = useRef(false)
  const reconciliacaoPendente = useRef(false)
  const [confirmacaoPendente, setConfirmacaoPendente] = useState(false)

  useEffect(() => {
    let ativo = true
    Promise.all([servicoPecas.listarPecas(), servicoPecas.listarCategorias()])
      .then(([pecas, categorias]) => {
        if (ativo) {
          setEstado({ pecas, categorias, carregando: false, erro: '' })
          reconciliacaoPendente.current = false
          setConfirmacaoPendente(false)
        }
      })
      .catch(erro => {
        if (ativo) setEstado(atual => ({ ...atual, carregando: false, erro: erro.message || 'Não foi possível carregar o catálogo.' }))
      })
    return () => { ativo = false }
  }, [revisao])

  function recarregar() {
    if (operacaoPendente.current) return
    setErroAcao('')
    setEstado(atual => ({ ...atual, carregando: true, erro: '' }))
    setRevisao(valor => valor + 1)
  }

  async function executar(acao) {
    if (estado.carregando || estado.erro) throw new Error('Aguarde o carregamento completo do catálogo antes de alterar uma peça.')
    if (operacaoPendente.current) throw new Error('Aguarde a operação em andamento.')
    if (reconciliacaoPendente.current) throw new Error('Recarregue o catálogo para conferir a última gravação antes de alterar outra peça.')
    operacaoPendente.current = true
    setOcupado(true)
    setAviso('')
    setErroAcao('')
    try {
      return await acao()
    } catch (erro) {
      if (erro.resultadoIncerto) { reconciliacaoPendente.current = true; setConfirmacaoPendente(true) }
      setErroAcao(erro.message || 'Não foi possível concluir a operação.')
      throw erro
    } finally {
      operacaoPendente.current = false
      setOcupado(false)
    }
  }

  async function salvar(dados, id) {
    return executar(async () => {
      const peca = await servicoPecas.salvarPeca(dados, { id: id ?? null, idNovaPeca: dados.idNovaPeca })
      setEstado(atual => ({ ...atual, pecas: atual.pecas.some(item => item.id === peca.id) ? atual.pecas.map(item => item.id === peca.id ? peca : item) : [peca, ...atual.pecas] }))
      setAviso(id ? 'Alterações salvas no catálogo.' : 'Peça cadastrada no catálogo.')
      return peca.id
    })
  }

  async function alternar(id) {
    return executar(async () => {
      const atual = estado.pecas.find(item => item.id === id)
      if (!atual) throw new Error('A peça não foi encontrada.')
      const peca = await servicoPecas.alterarVisibilidade(id, !atual.visivel, atual.atualizadoEm)
      setEstado(dados => ({ ...dados, pecas: dados.pecas.map(item => item.id === id ? peca : item) }))
      setAviso(peca.visivel ? 'Peça visível na loja.' : 'Peça ocultada da loja.')
    })
  }

  async function excluir(id) {
    return executar(async () => {
      const atual = estado.pecas.find(item => item.id === id)
      if (!atual) throw new Error('A peça não foi encontrada.')
      await servicoPecas.excluirPeca(id, atual.atualizadoEm)
      setEstado(atual => ({ ...atual, pecas: atual.pecas.filter(item => item.id !== id) }))
      setAviso('Peça removida do catálogo. Os pedidos anteriores foram preservados.')
    })
  }

  return <CatalogoAdminContext.Provider value={{ ...estado, ocupado, confirmacaoPendente, aviso, erroAcao, salvar, alternar, excluir, recarregar }}><Outlet /></CatalogoAdminContext.Provider>
}

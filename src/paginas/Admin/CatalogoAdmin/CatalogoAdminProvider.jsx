import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { CatalogoAdminContext } from './catalogoContext'
import { PECAS_DEMONSTRACAO } from './dadosCatalogoDemonstracao'
import { adicionarPeca, editarPeca, alternarVisibilidade, excluirPeca, normalizarPeca } from './catalogoModelo'

export default function CatalogoAdminProvider() {
  const [pecas, setPecas] = useState(() => PECAS_DEMONSTRACAO.map(peca => ({ ...peca })))
  const [aviso, setAviso] = useState('')

  function salvar(dados, id) {
    const normalizada = normalizarPeca(dados)
    const identificador = id ?? crypto.randomUUID()
    if (id != null && !pecas.some(peca => String(peca.id) === String(id))) throw new Error('A peça não foi encontrada.')
    setPecas(atuais => id == null ? adicionarPeca(atuais, normalizada, identificador) : editarPeca(atuais, id, normalizada))
    setAviso(id == null ? 'Peça adicionada nesta prévia. As alterações são temporárias.' : 'Peça atualizada nesta prévia. As alterações são temporárias.')
    return identificador
  }

  function alternar(id) {
    const peca = pecas.find(item => String(item.id) === String(id))
    if (!peca) throw new Error('A peça não foi encontrada.')
    setPecas(atuais => alternarVisibilidade(atuais, id))
    setAviso(peca.nome + (peca.visivel ? ' foi ocultada' : ' voltou a ficar visível') + ' nesta prévia. As alterações são temporárias.')
  }

  function excluir(id) {
    if (!pecas.some(peca => String(peca.id) === String(id))) throw new Error('A peça não foi encontrada.')
    setPecas(atuais => excluirPeca(atuais, id))
    setAviso('Peça excluída desta prévia. As alterações são temporárias.')
  }

  return <CatalogoAdminContext.Provider value={{ pecas, aviso, salvar, alternar, excluir, demonstracao: true }}><Outlet /></CatalogoAdminContext.Provider>
}

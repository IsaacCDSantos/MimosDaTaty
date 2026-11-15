import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AdminAdicionarPeca from '../AdicionarPeca/AdminAdicionarPeca'
import AdminEditarPeca from '../EditarPeca/AdminEditarPeca'
import { CATEGORIAS_CATALOGO } from './catalogoModelo'
import { useCatalogoAdmin } from './useCatalogoAdmin'
import './FormularioCatalogoAdmin.css'

export default function FormularioCatalogoAdmin({ editar = false, demonstracao = false }) {
  const catalogo = useCatalogoAdmin()
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const [idNovaPeca] = useState(() => crypto.randomUUID())
  const montado = useRef(false)
  useEffect(() => { montado.current = true; return () => { montado.current = false } }, [])
  const id = parametros.get('id') || (demonstracao ? '1' : null)
  const peca = editar ? catalogo?.pecas.find(item => String(item.id) === id) : null
  const inicio = demonstracao ? '/previa/admin' : '/admin'
  const destino = inicio + '/catalogo'

  if (catalogo?.carregando) return <main className="catalog-admin-page"><section className="catalog-admin-panel"><p role="status">Carregando catálogo...</p></section></main>
  if (catalogo?.erro) return <main className="catalog-admin-page"><section className="catalog-admin-panel"><p role="alert">{catalogo.erro}</p><button type="button" className="catalog-admin-primary-button" onClick={catalogo.recarregar}>Tentar novamente</button><Link className="catalog-admin-secondary-button" to={destino}>Voltar ao catálogo</Link></section></main>
  if (!catalogo || (editar && !peca)) return <main className="catalog-admin-page"><section className="catalog-admin-panel"><h1>Peça não encontrada</h1><p>Selecione uma peça disponível no catálogo para editar.</p><Link className="catalog-admin-primary-button" to={destino}>Voltar ao catálogo</Link></section></main>

  const categorias = demonstracao ? CATEGORIAS_CATALOGO.map(nome => ({ nome, ativa: true })) : catalogo.categorias.filter(item => item.ativa !== false || item.id === peca?.categoriaId)
  const props = {
    demonstracao,
    voltarPara: destino,
    categorias,
    operacaoPendente: catalogo.ocupado || false,
    confirmacaoPendente: catalogo.confirmacaoPendente || false,
    aoSalvar: async dados => {
      const categoria = categorias.find(item => item.nome === dados.categoria)
      if (!categoria) throw new Error('Selecione uma categoria disponível.')
      await catalogo.salvar({ ...dados, categoriaId: categoria.id, idNovaPeca }, editar ? id : undefined)
      if (montado.current) navigate(destino)
    },
    ...(editar ? { pecaInicial: peca, aoExcluir: async () => { await catalogo.excluir(id); if (montado.current) navigate(destino) } } : {}),
  }
  return editar ? <AdminEditarPeca key={id} {...props} /> : <AdminAdicionarPeca {...props} />
}

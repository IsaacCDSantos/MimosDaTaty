import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIAS_CATALOGO, filtrarPorCategorias } from './catalogoModelo'
import { useCatalogoAdmin } from './useCatalogoAdmin'
import './CatalogoAdmin.css'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CatalogoAdmin({ demonstracao = false }) {
  const catalogo = useCatalogoAdmin()
  const [categorias, setCategorias] = useState([])
  const [erroAcao, setErroAcao] = useState('')
  const bloqueado = !catalogo || Boolean(catalogo.carregando || catalogo.erro || catalogo.ocupado || catalogo.confirmacaoPendente)
  const inicio = demonstracao ? '/previa/admin' : '/admin'
  const categoriasDisponiveis = demonstracao ? CATEGORIAS_CATALOGO : [...new Set([...(catalogo?.categorias || []).map(item => item.nome), ...(catalogo?.pecas || []).map(item => item.categoria)])]
  const pecas = filtrarPorCategorias(catalogo?.pecas ?? [], categorias.filter(nome => categoriasDisponiveis.includes(nome)), categoriasDisponiveis)

  function selecionarCategoria(categoria) {
    setCategorias(atuais => atuais.includes(categoria) ? atuais.filter(item => item !== categoria) : [...atuais, categoria])
  }

  async function alterarVisibilidade(id) {
    setErroAcao('')
    try { await catalogo.alternar(id) } catch (erro) { setErroAcao(erro.message || 'Não foi possível alterar a visibilidade.') }
  }

  function impedirDuranteOperacao(event) {
    if (bloqueado) event.preventDefault()
  }

  return (
    <div className="catalog-admin-page">
      <div className="catalog-admin-shell">
        <header className="catalog-admin-header">
          <nav className="catalog-admin-nav" aria-label="Navegação administrativa">
            <Link to={inicio}>Home</Link>
            <Link className="catalog-admin-nav-active" to={inicio + '/catalogo'} aria-current="page">Catálogo</Link>
            <Link to={inicio + '/pedidos'}>Pedidos</Link>
          </nav>
          <span className="catalog-admin-account">{demonstracao ? 'Admin: Tati' : 'Admin'}</span>
        </header>
        <main aria-labelledby="catalog-admin-title">
          <section className="catalog-admin-heading">
            <div className="catalog-admin-heading-copy">
              <h1 id="catalog-admin-title">Catálogo da loja</h1>
              <p>Adicione novas peças e edite as que estão no catálogo.</p>
            </div>
            <Link className="catalog-admin-primary-button" to={inicio + '/adicionar-peca'} aria-disabled={bloqueado} onClick={event => { if (bloqueado) event.preventDefault() }}>+ Adicionar nova peça</Link>
          </section>
          <section className="catalog-admin-panel" aria-label="Gerenciar peças do catálogo">
            <div className="catalog-admin-filters" role="group" aria-labelledby="catalog-admin-categories">
              <span className="catalog-admin-filter-title" id="catalog-admin-categories">Categorias:</span>
              {categoriasDisponiveis.map(categoria => <label className="catalog-admin-filter" key={categoria}><input type="checkbox" checked={categorias.includes(categoria)} onChange={() => selecionarCategoria(categoria)} />{categoria}</label>)}
            </div>
            {catalogo?.carregando && <p className="catalog-admin-feedback" role="status">Carregando catálogo...</p>}
            {catalogo?.erro && <div className="catalog-admin-feedback" role="alert"><p>{catalogo.erro}</p><button type="button" className="catalog-admin-secondary-button" onClick={catalogo.recarregar}>Tentar novamente</button></div>}
            <ul className="catalog-admin-products" aria-label="Peças do catálogo">
              {pecas.map(peca => <li className="catalog-admin-product" key={peca.id}>
                <img className="catalog-admin-product-image" src={peca.imagem} alt={peca.nome} width="76" height="76" loading="lazy" decoding="async" />
                <div className="catalog-admin-product-copy">
                  <h2 className="catalog-admin-product-name">{peca.nome}</h2>
                  <p className="catalog-admin-product-description">{peca.descricao}</p>
                  <div className="catalog-admin-badges"><span className="catalog-admin-category">{peca.categoria}</span><span className={'catalog-admin-visibility' + (peca.visivel ? '' : ' catalog-admin-visibility--hidden')}>{peca.visivel ? 'Visível' : 'Oculta'}</span></div>
                </div>
                <p className="catalog-admin-price">{moeda.format(peca.preco)}</p>
                <div className="catalog-admin-actions">
                  <Link className="catalog-admin-primary-button" to={inicio + '/editar-peca?id=' + encodeURIComponent(peca.id)} aria-disabled={bloqueado} onClick={impedirDuranteOperacao} aria-label={'Editar peça ' + peca.nome}>Editar peça</Link>
                  <button className="catalog-admin-secondary-button" type="button" disabled={bloqueado} onClick={() => alterarVisibilidade(peca.id)} aria-label={(peca.visivel ? 'Ocultar da loja: ' : 'Mostrar na loja: ') + peca.nome}>{peca.visivel ? 'Ocultar da loja' : 'Mostrar na loja'}</button>
                </div>
              </li>)}
            </ul>
            {!catalogo?.carregando && !catalogo?.erro && !pecas.length && <div className="catalog-admin-empty" role="status"><p>{categorias.length ? 'Nenhuma peça encontrada nas categorias selecionadas.' : 'Seu catálogo está vazio. Adicione a primeira peça.'}</p>{categorias.length > 0 && <button className="catalog-admin-secondary-button" type="button" onClick={() => setCategorias([])}>Limpar filtros</button>}</div>}
            <Link className="catalog-admin-add-button" to={inicio + '/adicionar-peca'} aria-disabled={bloqueado} onClick={event => { if (bloqueado) event.preventDefault() }}>+ Adicionar nova peça ao catálogo</Link>
            {(erroAcao || catalogo?.erroAcao) && <div className="catalog-admin-feedback" role="alert"><p>{erroAcao || catalogo.erroAcao}</p>{catalogo.recarregar && <button type="button" className="catalog-admin-secondary-button" disabled={catalogo.ocupado} onClick={() => { setErroAcao(''); catalogo.recarregar(); }}>Recarregar catálogo</button>}</div>}
            {catalogo?.aviso && <p className="catalog-admin-feedback" role="status">{catalogo.aviso}</p>}
          </section>
        </main>
        {demonstracao && <footer className="catalog-admin-footer">Prévia com produtos fictícios · alterações temporárias</footer>}
      </div>
    </div>
  )
}

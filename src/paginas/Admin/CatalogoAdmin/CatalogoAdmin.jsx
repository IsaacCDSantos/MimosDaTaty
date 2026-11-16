import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import MiniaturaProduto from '../../Catalogo/MiniaturaProduto'
import { CATEGORIAS_CATALOGO, filtrarPorCategorias } from './catalogoModelo'
import { useCatalogoAdmin } from './useCatalogoAdmin'
import './CatalogoAdmin.css'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CatalogoAdmin({ demonstracao = false }) {
  const catalogo = useCatalogoAdmin()
  const [categorias, setCategorias] = useState([])
  const [erroAcao, setErroAcao] = useState('')
  const [fotoAmpliada, setFotoAmpliada] = useState(null)
  const bloqueado = !catalogo || Boolean(catalogo.carregando || catalogo.erro || catalogo.ocupado || catalogo.confirmacaoPendente)
  const inicio = demonstracao ? '/previa/admin' : '/admin'

  useEffect(() => {
    if (!fotoAmpliada) return
    const aoPressionarEsc = event => {
      if (event.key === 'Escape') setFotoAmpliada(null)
    }
    window.addEventListener('keydown', aoPressionarEsc)
    return () => window.removeEventListener('keydown', aoPressionarEsc)
  }, [fotoAmpliada])
  const categoriasDisponiveis = demonstracao
    ? CATEGORIAS_CATALOGO
    : [...new Set([
        ...(catalogo?.categorias || []).filter(item => item.ativa !== false && item.nome !== 'Presentes').map(item => item.nome),
        ...(catalogo?.pecas || []).map(item => item.categoria).filter(nome => nome && nome !== 'Presentes'),
      ])]
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
            <section className="catalog-admin-filters" aria-labelledby="catalog-admin-categories">
              <div className="catalog-admin-filters-header">
                <span className="catalog-admin-filters-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 6h16M7 12h10M10 18h4"
                      stroke="currentColor"
                      strokeWidth="2.1"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="catalog-admin-filter-title" id="catalog-admin-categories">Categorias</span>
              </div>

              <div className="catalog-admin-filters-list" role="group" aria-labelledby="catalog-admin-categories">
                <button
                  type="button"
                  className={'catalog-admin-filter-all' + (categorias.length === 0 ? ' catalog-admin-filter--active' : '')}
                  onClick={() => setCategorias([])}
                >
                  Todas
                </button>

                {categoriasDisponiveis.map(categoria => {
                  const selecionada = categorias.includes(categoria)
                  return (
                    <label
                      className={'catalog-admin-filter' + (selecionada ? ' catalog-admin-filter--active' : '')}
                      key={categoria}
                    >
                      <input
                        type="checkbox"
                        className="catalog-admin-filter-checkbox"
                        checked={selecionada}
                        onChange={() => selecionarCategoria(categoria)}
                      />
                      <span className="catalog-admin-filter-indicator" aria-hidden="true">
                        {selecionada && (
                          <svg viewBox="0 0 16 16" fill="none">
                            <path
                              d="M3.5 8.5L6.5 11.5L12.5 5"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span>{categoria}</span>
                    </label>
                  )
                })}
              </div>
            </section>
            {catalogo?.carregando && <p className="catalog-admin-feedback" role="status">Carregando catálogo...</p>}
            {catalogo?.erro && <div className="catalog-admin-feedback" role="alert"><p>{catalogo.erro}</p><button type="button" className="catalog-admin-secondary-button" onClick={catalogo.recarregar}>Tentar novamente</button></div>}
            <ul className="catalog-admin-products" aria-label="Peças do catálogo">
              {pecas.map(peca => <li className="catalog-admin-product" key={peca.id}>
                <button
                  type="button"
                  className="catalog-admin-product-thumb"
                  onClick={() => setFotoAmpliada(peca)}
                  aria-label={`Visualizar foto ampliada de ${peca.nome}`}
                  title="Clique para ver a foto ampliada"
                >
                  <MiniaturaProduto
                    src={peca.imagem}
                    alt={peca.nome}
                    className="catalog-admin-product-image"
                    larguraAlvo={480}
                  />
                  <span className="catalog-admin-thumb-zoom-icon" aria-hidden="true" title="Ampliar foto">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM13 13l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 6.5v5M6.5 9h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
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

      {fotoAmpliada && (
        <div
          className="catalog-admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização em alta resolução de ${fotoAmpliada.nome}`}
          onClick={() => setFotoAmpliada(null)}
        >
          <div
            className="catalog-admin-modal-card"
            onClick={event => event.stopPropagation()}
          >
            <div className="catalog-admin-modal-header">
              <div className="catalog-admin-modal-info">
                <h3 className="catalog-admin-modal-title">{fotoAmpliada.nome}</h3>
                <span className="catalog-admin-category">{fotoAmpliada.categoria}</span>
              </div>
              <button
                type="button"
                className="catalog-admin-modal-close"
                onClick={() => setFotoAmpliada(null)}
                aria-label="Fechar visualização ampliada"
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="catalog-admin-modal-body">
              <img
                src={fotoAmpliada.imagem}
                alt={fotoAmpliada.nome}
                className="catalog-admin-modal-image"
                decoding="async"
              />
            </div>
            <div className="catalog-admin-modal-footer">
              <span className="catalog-admin-modal-hint">Foto em resolução original</span>
              <button
                type="button"
                className="catalog-admin-secondary-button catalog-admin-modal-btn-fechar"
                onClick={() => setFotoAmpliada(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

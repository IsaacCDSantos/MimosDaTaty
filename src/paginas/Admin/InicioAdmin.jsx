import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import logoMimos from '../../assets/imagens/logo-mimos-da-taty.png'
import imagemAtelie from '../../assets/imagens/banner-principal.png'
import bonequinha from '../../assets/imagens/06-bonequinha.png'
import './InicioAdmin.css'

function IconeAdmin({ nome, ...props }) {
  const desenhos = {
    seta: <path d="M4 12h16m-6-6 6 6-6 6" />,
    externo: <path d="M7 17 17 7M7 7h10v10" />,
    coracao: <path d="M20.5 4.7a5.4 5.4 0 0 0-7.6 0L12 5.6l-.9-.9a5.4 5.4 0 0 0-7.6 7.6L12 21l8.5-8.7a5.4 5.4 0 0 0 0-7.6Z" />,
    escudo: <path d="m12 3 7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Z" />,
    catalogo: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 8h18M3 13h18M3 18h18M8 3v18M13 3v18M18 3v18" /></>,
    pedidos: <><path d="M8 9V7a4 4 0 0 1 8 0v2M5 9h14l1 9H4l1-9ZM12 15v7m-3-3 3 3 3-3M5 13H2v7h4m13-7h3v7h-4" /></>,
    peca: <><path d="M8 10V7a4 4 0 0 1 8 0v3l3-2 2 4-4 2v7H7v-7l-4-2 2-4 3 2Z" /><path d="M10 7h4M12 14v7" /></>,
    fechar: <path d="m6 6 12 12M18 6 6 18" />,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{desenhos[nome]}</svg>
}

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function InicioAdmin({ dados, demonstracao = false }) {
  const [areaSolicitada, setAreaSolicitada] = useState(null)
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const dialogoProduto = useRef(null)
  const nome = dados?.administradora || 'Tati'
  const resumo = dados?.resumo
  const destaques = dados?.destaques || []
  const categorias = dados?.categorias || []

  useEffect(() => {
    const dialogo = dialogoProduto.current
    if (produtoSelecionado && !dialogo.open) dialogo.showModal()
    if (!produtoSelecionado && dialogo.open) dialogo.close()
  }, [produtoSelecionado])

  return (
    <div className="admin-home">
      <div className="admin-home-container">
        <header className="admin-home-header">
          <Link className="admin-home-brand" to="/" aria-label="Mimos da Taty — ir para a vitrine">
            <img src={logoMimos} alt="" width="64" height="49" />
            <span><span className="admin-home-wordmark">Mimos da Taty</span><span className="admin-home-brand-caption">GESTÃO DO ATELIÊ</span></span>
          </Link>
          <div className="admin-home-header-actions">
            <Link className="admin-home-shop-link" to="/">Ver vitrine da loja <IconeAdmin nome="externo" /></Link>
            <span className="admin-home-account"><span className="admin-home-dot" /><IconeAdmin nome="escudo" /> Admin: {nome}</span>
          </div>
        </header>

        <main>
          <section className="admin-home-welcome" aria-labelledby="admin-home-title">
            <div className="admin-home-welcome-copy">
              <div className="admin-home-eyebrow"><span className="admin-home-kicker">ESPAÇO DA ARTESÃ</span><span>{demonstracao ? 'Prévia com dados de exemplo' : dados ? 'Visão geral do ateliê' : 'Aguardando dados do ateliê'}</span></div>
              <h1 id="admin-home-title">Olá, {nome}! Bem-vinda ao seu ateliê</h1>
              <p className="admin-home-welcome-description">Escolha abaixo para onde deseja ir. Gerencie suas peças artesanais, cadastre novas criações ou acompanhe suas encomendas com um clique.</p>
              <div className="admin-home-summary" aria-label="Resumo do catálogo">
                <span className="admin-home-summary-icon"><IconeAdmin nome="peca" /></span>
                <div className="admin-home-summary-content">
                  <div className="admin-home-summary-line"><strong>{resumo?.total ?? '—'} peças no catálogo</strong><span className="admin-home-badge admin-home-badge--visible">{resumo?.visiveis ?? '—'} visíveis na loja</span><span className="admin-home-badge admin-home-badge--hidden">{resumo?.ocultas ?? '—'} ocultas</span></div>
                  <p>{categorias.length ? `${categorias.length} categorias ativas: ${categorias.join(', ')}` : 'Peças organizadas por categoria'}</p>
                </div>
              </div>
            </div>
            <div className="admin-home-hero-art">
              <img className="admin-home-hero-photo" src={imagemAtelie} alt="Bonequinha artesanal entre novelos, bordados e tecidos do ateliê" width="1678" height="937" fetchPriority="high" />
              <IconeAdmin nome="coracao" className="admin-home-heart admin-home-heart--large" />
              <IconeAdmin nome="coracao" className="admin-home-heart admin-home-heart--small" />
              <span className="admin-home-photo-caption"><IconeAdmin nome="coracao" /> Cada ponto feito com amor · Bordados &amp; Crochê</span>
            </div>
          </section>

          <div className="admin-home-panels">
            <section className="admin-home-panel admin-home-shortcuts" aria-labelledby="admin-home-shortcuts-title">
              <div className="admin-home-section-heading"><div><h2 id="admin-home-shortcuts-title">Atalhos do Ateliê</h2><p>Acesso direto às áreas principais de gerenciamento da sua loja</p></div><span className="admin-home-navigation-label">Navegação Rápida</span></div>
              <div className="admin-home-shortcut-grid">
                <article className="admin-home-shortcut admin-home-shortcut--catalog">
                  <div className="admin-home-shortcut-top"><span className="admin-home-shortcut-icon"><IconeAdmin nome="catalogo" /></span><button type="button" onClick={() => setAreaSolicitada('catálogo')}>Acessar Catálogo <IconeAdmin nome="seta" /></button></div>
                  <h3>Catálogo da Loja</h3><p>Adicione novas peças, edite valores, descrições e controle o que fica visível na vitrine.</p>
                </article>
                <article className="admin-home-shortcut admin-home-shortcut--orders">
                  <div className="admin-home-shortcut-top"><span className="admin-home-shortcut-icon"><IconeAdmin nome="pedidos" /></span><Link to={demonstracao ? '/previa/admin/pedidos' : '/admin/pedidos'}>Acessar Pedidos <IconeAdmin nome="seta" /></Link></div>
                  <h3>Painel de Pedidos</h3><p>Veja os pedidos novos, acompanhe a produção das encomendas e atualize o status de envio.</p>
                </article>
              </div>
              {areaSolicitada && <div className="admin-home-feedback" role="status"><p>{demonstracao ? 'Você está na prévia do painel. ' : ''}As telas de peças permitem conferir os formulários. O salvamento ainda não está disponível e nenhuma informação da loja será alterada.</p>{areaSolicitada === 'catálogo' && <><Link to="">Ver catálogo da loja <IconeAdmin nome="seta" /></Link><Link to={`${demonstracao ? '/previa/admin' : '/admin'}/adicionar-peca`}>Adicionar peça <IconeAdmin nome="seta" /></Link><Link to={`${demonstracao ? '/previa/admin' : '/admin'}/editar-peca`}>{demonstracao ? 'Editar peça de exemplo' : 'Editar peça'} <IconeAdmin nome="seta" /></Link></>}<button type="button" aria-label="Fechar aviso" onClick={() => setAreaSolicitada(null)}><IconeAdmin nome="fechar" /></button></div>}
              <aside className="admin-home-story" aria-labelledby="admin-home-story-title">
                <div className="admin-home-story-copy"><p className="admin-home-story-eyebrow"><span className="admin-home-dot" /> ESSÊNCIA ARTESANAL · DESDE 2006</p><h2 id="admin-home-story-title">Onde cada ponto se transforma em afeto</h2><p className="admin-home-story-description">O cantinho criativo da Tati para transformar fios de algodão, fitas e bordados delicados em memórias inesquecíveis para cada enxoval de bebê.</p><div className="admin-home-story-tags"><span>Crochê Artesanal</span><span>Bordado Personalizado</span><span>Enxoval Bebê</span></div></div>
                <img src={bonequinha} alt="" width="1536" height="2304" decoding="async" />
              </aside>
            </section>

            <section className="admin-home-panel admin-home-highlights" aria-labelledby="admin-home-highlights-title">
              <div className="admin-home-section-heading"><div><h2 id="admin-home-highlights-title">Destaques do Catálogo</h2><p>Peças mais procuradas pelas clientes na vitrine</p></div><Link className="admin-home-view-all" to="/catalogo" aria-label="Ver todas as peças na vitrine">Ver todas <IconeAdmin nome="seta" /></Link></div>
              {destaques.length ? <ul className="admin-home-product-list">{destaques.map(produto => <li key={produto.id}><button className="admin-home-product" type="button" onClick={() => setProdutoSelecionado(produto)} aria-label={`Ver detalhes de ${produto.nome}`}><img src={produto.imagem} alt={produto.nome} width="96" height="96" loading="lazy" decoding="async" /><span className="admin-home-product-info"><strong>{produto.nome}</strong><span className="admin-home-product-description">{produto.descricao}</span><span className="admin-home-product-price">{formatoMoeda.format(produto.preco)}</span></span><span className={`admin-home-badge ${produto.visivel ? 'admin-home-badge--visible' : 'admin-home-badge--hidden'}`}>{produto.visivel ? 'Visível' : 'Oculta'}</span></button></li>)}</ul> : <p className="admin-home-empty">Os destaques aparecerão aqui quando o catálogo estiver disponível.</p>}
            </section>
          </div>
        </main>

        <footer className="admin-home-footer"><p><span className="admin-home-dot" /> Painel Administrativo Mimos da Taty{demonstracao ? ' · Prévia com dados de exemplo' : ''}</p><p>Ateliê Mimos da Taty · Bordados &amp; Crochê</p></footer>
      </div>
      <dialog ref={dialogoProduto} className="admin-home-product-dialog" aria-labelledby="admin-home-product-title" onClose={() => setProdutoSelecionado(null)}>
        {produtoSelecionado && <><button className="admin-home-dialog-close" type="button" aria-label="Fechar detalhes da peça" onClick={() => dialogoProduto.current.close()} autoFocus><IconeAdmin nome="fechar" /></button><img src={produtoSelecionado.imagem} alt={produtoSelecionado.nome} width="240" height="240" /><div className="admin-home-dialog-copy"><span className="admin-home-kicker">{demonstracao ? 'PEÇA DE EXEMPLO' : produtoSelecionado.categoria}</span><h2 id="admin-home-product-title">{produtoSelecionado.nome}</h2><p>{produtoSelecionado.descricao}</p><strong>{formatoMoeda.format(produtoSelecionado.preco)}</strong><dl><div><dt>Categoria</dt><dd>{produtoSelecionado.categoria}</dd></div><div><dt>Prazo de entrega</dt><dd>{produtoSelecionado.prazo}</dd></div><div><dt>Na vitrine</dt><dd>{produtoSelecionado.visivel ? 'Visível' : 'Oculta'}</dd></div></dl></div></>}
      </dialog>
    </div>
  )
}

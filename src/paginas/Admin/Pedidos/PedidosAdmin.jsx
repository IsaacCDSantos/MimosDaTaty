import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  STATUS_PEDIDO, calcularResumo, contarStatus, filtrarPedidos,
  formatarData, formatarMoeda, mudarStatus, salvarObservacao, salvarRastreio,
} from './pedidosModelo'
import './PedidosAdmin.css'

function IconePedido({ nome, ...props }) {
  const desenhos = {
    fechar: <path d="m6 6 12 12M18 6 6 18" />,
    esquerda: <path d="m14 6-6 6 6 6" />,
    direita: <path d="m10 6 6 6-6 6" />,
    sacola: <><path d="M5 8h14l1 13H4L5 8ZM8 9V6a4 4 0 0 1 8 0v3" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{desenhos[nome]}</svg>
}

function SeloStatus({ status }) {
  const rotulo = STATUS_PEDIDO.find(item => item.valor === status)?.rotulo || 'Não informado'
  return <span className={`orders-admin-status orders-admin-status--${status}`}>{rotulo}</span>
}

function DetalhesPedido({ pedido, demonstracao, aoAlterar, aoFechar }) {
  const [codigo, setCodigo] = useState(pedido.codigoRastreio || '')
  const [observacao, setObservacao] = useState(pedido.observacaoInterna || '')
  const [aviso, setAviso] = useState(null)
  const campoRastreio = useRef(null)
  const resumo = calcularResumo(pedido)
  const indice = STATUS_PEDIDO.findIndex(item => item.valor === pedido.status)
  const anterior = STATUS_PEDIDO[indice - 1]
  const proximo = STATUS_PEDIDO[indice + 1]

  function aplicarAlteracao(alteracao, mensagem, campo) {
    if (!demonstracao) {
      setAviso({ erro: true, texto: 'A atualização de pedidos ainda não está disponível.' })
      return
    }
    try {
      aoAlterar(alteracao())
      setAviso({ erro: false, texto: `${mensagem} nesta prévia. As alterações são temporárias.` })
    } catch (erro) {
      setAviso({ erro: true, texto: erro.message })
      campo?.current?.focus()
    }
  }

  function salvarCodigoRastreio() {
    aplicarAlteracao(() => salvarRastreio(pedido, codigo), 'Rastreio atualizado', campoRastreio)
  }

  function avancarStatus(event) {
    event.preventDefault()
    if (!proximo) return
    const rastreio = proximo.valor === 'enviado' ? codigo : pedido.codigoRastreio
    aplicarAlteracao(() => mudarStatus(pedido, proximo.valor, rastreio), 'Status atualizado', campoRastreio)
  }

  return (
    <div className="orders-admin-detail">
      <header className="orders-admin-detail-header">
        <div><span className="orders-admin-detail-eyebrow">GESTÃO DE ENCOMENDAS</span><h2 id="orders-admin-detail-title">Pedido #{pedido.id}</h2><p>Recebido em {formatarData(pedido.data)}</p></div>
        <SeloStatus status={pedido.status} />
        <button className="orders-admin-close" type="button" aria-label="Fechar detalhes do pedido" onClick={aoFechar} autoFocus><IconePedido nome="fechar" /></button>
      </header>
      {demonstracao && <p className="orders-admin-demo-notice">Pedido fictício para demonstração. Nenhuma encomenda real será alterada.</p>}
      <div className="orders-admin-detail-grid">
        <div className="orders-admin-detail-main">
          <section className="orders-admin-detail-section" aria-labelledby="orders-admin-customer-title">
            <h3 id="orders-admin-customer-title">Cliente e entrega</h3>
            <dl className="orders-admin-customer-data">
              <div><dt>Cliente</dt><dd>{pedido.cliente.nome}</dd></div>
              <div><dt>E-mail</dt><dd>{pedido.cliente.email}</dd></div>
              <div><dt>Telefone</dt><dd>{pedido.cliente.telefone}</dd></div>
              <div className="orders-admin-address"><dt>Endereço</dt><dd>{pedido.endereco.logradouro}, {pedido.endereco.numero}{pedido.endereco.complemento && ` · ${pedido.endereco.complemento}`}<br />{pedido.endereco.bairro} · {pedido.endereco.cidade}/{pedido.endereco.uf}<br />CEP {pedido.endereco.cep}</dd></div>
            </dl>
          </section>
          <section className="orders-admin-detail-section" aria-labelledby="orders-admin-items-title">
            <h3 id="orders-admin-items-title">Itens do pedido</h3>
            <ul className="orders-admin-detail-items">{pedido.itens.map(item => <li key={item.id}>
              {item.imagem ? <img src={item.imagem} alt={item.nome} width="64" height="64" /> : <span className="orders-admin-item-placeholder"><IconePedido nome="sacola" /></span>}
              <div><strong>{item.nome}</strong><p>{item.quantidade} × {formatarMoeda(item.precoUnitario)}</p></div><strong>{formatarMoeda(item.quantidade * item.precoUnitario)}</strong>
            </li>)}</ul>
          </section>
          <section className="orders-admin-detail-section orders-admin-customer-note" aria-labelledby="orders-admin-customer-note-title"><h3 id="orders-admin-customer-note-title">Observações da cliente</h3><p>{pedido.observacaoCliente || 'A cliente não deixou observações neste pedido.'}</p></section>
          <form className="orders-admin-detail-section orders-admin-note-form" onSubmit={event => { event.preventDefault(); aplicarAlteracao(() => salvarObservacao(pedido, observacao), 'Observação interna salva') }}>
            <label htmlFor="orders-admin-internal-note">Observação interna</label><p>Uso exclusivo da administração. Não aparece para a cliente.</p>
            <textarea id="orders-admin-internal-note" value={observacao} onChange={event => { setObservacao(event.target.value); setAviso(null) }} placeholder="Registre os cuidados e detalhes da produção..." maxLength={2000} rows={4} disabled={!demonstracao} />
            <button className="orders-admin-primary-button" type="submit" disabled={!demonstracao}>Salvar observação</button>
          </form>
        </div>
        <div className="orders-admin-detail-aside">
          <section className="orders-admin-detail-section" aria-labelledby="orders-admin-financial-title"><h3 id="orders-admin-financial-title">Resumo do pedido</h3><dl className="orders-admin-totals"><div><dt>Subtotal</dt><dd>{formatarMoeda(resumo.subtotal)}</dd></div><div><dt>Frete</dt><dd>{formatarMoeda(resumo.frete)}</dd></div><div><dt>Desconto</dt><dd>{formatarMoeda(resumo.desconto)}</dd></div><div className="orders-admin-grand-total"><dt>Total</dt><dd>{formatarMoeda(resumo.total)}</dd></div></dl><p className="orders-admin-payment"><span>Forma de pagamento</span><strong>{pedido.formaPagamento}</strong></p></section>
          <form className="orders-admin-detail-section orders-admin-progress-form" onSubmit={avancarStatus}>
            <h3>Andamento do pedido</h3>
            <ol className="orders-admin-progress">{STATUS_PEDIDO.map((item, posicao) => <li key={item.valor} className={posicao <= indice ? 'orders-admin-progress-done' : ''} aria-current={item.valor === pedido.status ? 'step' : undefined}><span>{posicao + 1}</span>{item.rotulo}</li>)}</ol>
            {(pedido.status === 'em_producao' || pedido.status === 'enviado') && <div className="orders-admin-tracking-field"><label htmlFor="orders-admin-tracking">Código de rastreio</label><input ref={campoRastreio} id="orders-admin-tracking" onKeyDown={event => { if (event.key === 'Enter' && pedido.status === 'enviado') { event.preventDefault(); salvarCodigoRastreio() } }} value={codigo} onChange={event => { setCodigo(event.target.value); setAviso(null) }} placeholder="Informe o código de envio" autoComplete="off" spellCheck={false} maxLength={80} required={proximo?.valor === 'enviado'} disabled={!demonstracao} /><p>{pedido.status === 'em_producao' ? 'Obrigatório para marcar como enviado.' : 'Código registrado para esta encomenda.'}</p>{pedido.status === 'enviado' && <button className="orders-admin-secondary-button" type="button" disabled={!demonstracao} onClick={salvarCodigoRastreio}>Salvar rastreio</button>}</div>}
            {pedido.status === 'entregue' && <p className="orders-admin-delivered-tracking">Rastreio registrado: <strong>{pedido.codigoRastreio || 'Não informado'}</strong></p>}
            <div className="orders-admin-status-actions"><button className="orders-admin-secondary-button" type="button" disabled={!demonstracao || !anterior} onClick={() => anterior && aplicarAlteracao(() => mudarStatus(pedido, anterior.valor, pedido.codigoRastreio), 'Status atualizado')}>{anterior ? `Voltar para ${anterior.rotulo}` : 'Etapa anterior'}</button><button className="orders-admin-primary-button" type="submit" disabled={!demonstracao || !proximo}>{proximo ? `Marcar como ${proximo.rotulo.toLowerCase()}` : 'Pedido entregue'}</button></div>
          </form>
          {aviso && <p className={`orders-admin-detail-feedback${aviso.erro ? ' orders-admin-detail-feedback--error' : ''}`} role={aviso.erro ? 'alert' : 'status'}>{aviso.texto}</p>}
        </div>
      </div>
    </div>
  )
}

const FILTROS = [{ valor: 'todos', rotulo: 'Todos' }, { valor: 'em_producao', rotulo: 'Em produção' }, { valor: 'enviado', rotulo: 'Enviados' }, { valor: 'entregue', rotulo: 'Entregues' }]
const POR_PAGINA = 6

export default function PedidosAdmin({ pedidosIniciais = [], demonstracao = false }) {
  const [pedidos, setPedidos] = useState(() => pedidosIniciais.map(pedido => ({ ...pedido })))
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState(null)
  const [avisoCatalogo, setAvisoCatalogo] = useState(false)
  const dialogo = useRef(null)
  const campoBusca = useRef(null)
  const origemFoco = useRef(null)
  const contagens = contarStatus(pedidos)
  const filtrados = filtrarPedidos(pedidos, { status: filtro, busca })
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const primeiroIndice = (paginaAtual - 1) * POR_PAGINA
  const visiveis = filtrados.slice(primeiroIndice, primeiroIndice + POR_PAGINA)
  const selecionado = pedidos.find(pedido => pedido.id === pedidoSelecionadoId)
  const inicio = demonstracao ? '/previa/admin' : '/admin'

  useEffect(() => {
    if (pedidoSelecionadoId !== null && !dialogo.current.open) dialogo.current.showModal()
    if (pedidoSelecionadoId === null && dialogo.current.open) dialogo.current.close()
  }, [pedidoSelecionadoId])

  function abrirDetalhes(id, origem) {
    origemFoco.current = origem
    setPedidoSelecionadoId(id)
  }
  function fecharDetalhes() {
    setPedidoSelecionadoId(null)
    if (origemFoco.current?.isConnected) origemFoco.current.focus()
    else campoBusca.current?.focus()
  }
  function atualizarPedido(atualizado) {
    setPedidos(atuais => atuais.map(pedido => pedido.id === atualizado.id ? atualizado : pedido))
    setPagina(1)
  }
  function limparFiltros() {
    setBusca('')
    setFiltro('todos')
    setPagina(1)
  }

  return (
    <div className="orders-admin-page">
      <div className="orders-admin-circle orders-admin-circle--left" aria-hidden="true" /><div className="orders-admin-circle orders-admin-circle--right" aria-hidden="true" />
      <div className="orders-admin-shell">
        <header className="orders-admin-header"><nav aria-label="Navegação administrativa"><Link to={inicio}>Home</Link><button type="button" onClick={() => setAvisoCatalogo(valor => !valor)}>Catálogo</button><Link className="orders-admin-nav-active" to={`${inicio}/pedidos`} aria-current="page">Pedidos</Link></nav><span className="orders-admin-account">Admin: Tati</span></header>
        <main className="orders-admin-card" aria-labelledby="orders-admin-title">
          <div className="orders-admin-heading"><h1 id="orders-admin-title">Pedidos</h1><p>Acompanhe e atualize o andamento dos pedidos da loja.</p>{demonstracao && <span className="orders-admin-demo-label">Prévia · dados de exemplo</span>}</div>
          {avisoCatalogo && <div className="orders-admin-catalog-notice" role="status"><p>O gerenciamento do catálogo ainda não está disponível.</p><Link to="/catalogo">Ver catálogo da loja</Link><button type="button" aria-label="Fechar aviso do catálogo" onClick={() => setAvisoCatalogo(false)}><IconePedido nome="fechar" /></button></div>}
          <div className="orders-admin-summary" aria-label="Resumo de todos os pedidos"><div><span>Novos</span><strong>{contagens.novo}</strong></div><div><span>Em produção</span><strong>{contagens.em_producao}</strong></div><div><span>Enviados</span><strong>{contagens.enviado}</strong></div></div>
          <div className="orders-admin-toolbar"><div className="orders-admin-filters" role="group" aria-label="Filtrar pedidos por status">{FILTROS.map(item => <button key={item.valor} type="button" className={filtro === item.valor ? 'orders-admin-filter-active' : ''} aria-pressed={filtro === item.valor} onClick={() => { setFiltro(item.valor); setPagina(1) }}>{item.rotulo}</button>)}</div><div className="orders-admin-search"><label className="orders-admin-sr-only" htmlFor="orders-admin-search">Buscar cliente ou número do pedido</label><input ref={campoBusca} id="orders-admin-search" type="search" placeholder="Buscar cliente ou nº do pedido" value={busca} onChange={event => { setBusca(event.target.value); setPagina(1) }} autoComplete="off" /></div></div>
          <div className="orders-admin-table-wrap"><table className="orders-admin-table"><caption className="orders-admin-sr-only">Pedidos da loja, com cliente, data, itens, total e status</caption><colgroup><col className="orders-admin-col-number" /><col className="orders-admin-col-customer" /><col className="orders-admin-col-items" /><col className="orders-admin-col-total" /><col className="orders-admin-col-status" /><col className="orders-admin-col-actions" /></colgroup><thead><tr><th scope="col">Pedido</th><th scope="col">Cliente</th><th scope="col">Itens</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col"><span className="orders-admin-sr-only">Ações</span></th></tr></thead><tbody>{visiveis.map(pedido => <tr key={pedido.id}>
            <td className="orders-admin-number" data-label="Pedido">#{pedido.id}</td><td className="orders-admin-customer" data-label="Cliente"><span>{pedido.cliente.nome}</span><time dateTime={pedido.data}>{formatarData(pedido.data)}</time></td><td className="orders-admin-items" data-label="Itens">{pedido.resumoItens}</td><td className="orders-admin-total" data-label="Total">{formatarMoeda(calcularResumo(pedido).total)}</td><td className="orders-admin-status-cell" data-label="Status"><SeloStatus status={pedido.status} /></td><td className="orders-admin-actions"><button type="button" aria-label={`Ver detalhes do pedido #${pedido.id} de ${pedido.cliente.nome}`} onClick={event => abrirDetalhes(pedido.id, event.currentTarget)}>Detalhes</button></td>
          </tr>)}{!visiveis.length && <tr className="orders-admin-empty"><td colSpan={6}><p>{pedidos.length ? 'Nenhum pedido encontrado para essa busca.' : 'Nenhum pedido disponível.'}</p>{pedidos.length > 0 && <button type="button" onClick={limparFiltros}>Limpar filtros</button>}</td></tr>}</tbody></table></div>
          <nav className="orders-admin-pagination" aria-label="Paginação dos pedidos"><output aria-live="polite">{filtrados.length ? `Mostrando ${primeiroIndice + 1}–${Math.min(primeiroIndice + POR_PAGINA, filtrados.length)} de ${filtrados.length} ${filtrados.length === 1 ? 'pedido' : 'pedidos'}` : '0 pedidos encontrados'}</output><div><button type="button" aria-label="Página anterior" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)}><IconePedido nome="esquerda" /> Anterior</button><span>Página {paginaAtual} de {totalPaginas}</span><button type="button" aria-label="Próxima página" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima <IconePedido nome="direita" /></button></div></nav>
        </main>
      </div>
      <footer className="orders-admin-footer"><div className="orders-admin-border" aria-hidden="true" /><p><span aria-hidden="true" />{demonstracao ? 'Prévia com dados de exemplo · alterações temporárias' : 'Gestão de pedidos do Ateliê Mimos da Taty'}</p></footer>
      <dialog className="orders-admin-dialog" ref={dialogo} aria-labelledby="orders-admin-detail-title" onClose={fecharDetalhes}>{selecionado && <DetalhesPedido key={selecionado.id} pedido={selecionado} demonstracao={demonstracao} aoAlterar={atualizarPedido} aoFechar={() => dialogo.current.close()} />}</dialog>
    </div>
  )
}

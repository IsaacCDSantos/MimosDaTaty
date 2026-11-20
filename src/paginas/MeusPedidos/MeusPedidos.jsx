import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../../servicos/supabase'
import ReferenciasPedido from '../../componentes/ReferenciasPedido/ReferenciasPedido'
import { carregarPedidosCliente, FILTROS_PEDIDOS_CLIENTE } from '../../servicos/pedidosCliente'
import { EstruturaContaCliente, MenuContaCliente } from '../../componentes/ContaCliente/ContaCliente'
import './MeusPedidos.css'

const ETAPAS = ['Pagamento aprovado', 'Em produção', 'Enviado', 'Entregue']
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dataLoja = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric',
})
function valorEmReais(centavos) {
  return Number.isSafeInteger(centavos) && centavos >= 0 ? moeda.format(centavos / 100) : 'Não informado'
}
function dataDoPedido(iso) {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return 'Data não informada'
  return dataLoja.format(new Date(iso)).replaceAll('.', '').replaceAll(' de ', ' ')
}
function formatarCep(valor) {
  const cep = String(valor || '').replace(/\D/g, '')
  return cep.length === 8 ? cep.slice(0, 5) + '-' + cep.slice(5) : cep
}
function EstruturaPedidos({ children }) {
  return <EstruturaContaCliente titulo="Meus pedidos" descricao="Acompanhe cada etapa dos seus mimos." classe="meus-pedidos-page">{children}</EstruturaContaCliente>
}
function FotoPedido({ item }) {
  const [falhou, setFalhou] = useState(false)
  return (
    <div className="meus-pedidos-foto">
      {item.imagem && !falhou
        ? <img src={item.imagem} alt={item.nome} loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />
        : <svg viewBox="0 0 32 32" fill="none" aria-label="Peça sem foto" role="img"><path d="M6 24V9h20v15H6Zm0-5 6-6 7 7 3-3 4 4M19 12h.01" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" /></svg>}
    </div>
  )
}
function EtapasPedido({ pedido }) {
  if (!Number.isInteger(pedido.estado.etapa)) return null
  return (
    <ol className="meus-pedidos-etapas" aria-label={'Andamento do pedido ' + pedido.numero}>
      {ETAPAS.map((etapa, indice) => (
        <li key={etapa} className={indice <= pedido.estado.etapa ? 'etapa-alcancada' : ''} aria-current={indice === pedido.estado.etapa ? 'step' : undefined}>
          <span aria-hidden="true">{indice <= pedido.estado.etapa ? '●' : '○'}</span> {etapa}
          <span className="meus-pedidos-sr">{indice === pedido.estado.etapa ? ' — etapa atual' : indice < pedido.estado.etapa ? ' — concluída' : ' — aguardando'}</span>
        </li>
      ))}
    </ol>
  )
}
function SeloPedido({ pedido }) {
  const tom = ['andamento', 'sucesso', 'alerta', 'neutro'].includes(pedido.estado.tom) ? pedido.estado.tom : 'neutro'
  return <span className={'meus-pedidos-status meus-pedidos-status-' + tom}>{pedido.estado.rotulo}</span>
}
function CartaoPedido({ pedido, onDetalhes }) {
  const principal = pedido.itens[0]
  return (
    <article className="meus-pedidos-card" aria-labelledby={'pedido-' + pedido.id}>
      <div className="meus-pedidos-card-topo">
        <div><h2 id={'pedido-' + pedido.id}>Pedido #{pedido.numero}</h2><p>Realizado em {dataDoPedido(pedido.dataCriacao)}</p></div>
        <SeloPedido pedido={pedido} />
      </div>
      {principal ? (
        <div className="meus-pedidos-item-resumo">
          <FotoPedido key={principal.imagem || principal.id} item={principal} />
          <div>
            <h3>{principal.nome}</h3>
            <p>{principal.quantidade} {principal.quantidade === 1 ? 'unidade' : 'unidades'}</p>
            {pedido.itens.length > 1 && <p>+ {pedido.itens.length - 1} {pedido.itens.length === 2 ? 'outra peça' : 'outras peças'}</p>}
            <strong>Total do pedido&nbsp; {valorEmReais(pedido.totalCentavos)}</strong>
          </div>
        </div>
      ) : <p className="meus-pedidos-sem-itens">Itens não disponíveis neste pedido. Total: {valorEmReais(pedido.totalCentavos)}</p>}
      {['em_producao', 'pagamento_aprovado'].includes(pedido.estado.chave) && <EtapasPedido pedido={pedido} />}
      <button className="meu-perfil-secundario meus-pedidos-detalhes" type="button" aria-label={'Ver detalhes do pedido ' + pedido.numero} onClick={evento => onDetalhes(pedido, evento.currentTarget)}>Ver detalhes do pedido</button>
    </article>
  )
}
export function DetalhesPedido({ pedido, onFechar }) {
  const endereco = pedido.endereco
  const temEndereco = endereco?.logradouro && endereco?.cidade
  return (
    <>
      <div className="meus-pedidos-dialogo-topo">
        <div><p className="meu-perfil-eyebrow">SEUS MIMOS</p><h2 id="meus-pedidos-dialogo-titulo">Pedido #{pedido.numero}</h2></div>
        <button className="meus-pedidos-fechar" type="button" onClick={onFechar} aria-label="Fechar detalhes do pedido">×</button>
      </div>
      <div className="meus-pedidos-dialogo-status"><p>Realizado em {dataDoPedido(pedido.dataCriacao)}</p><SeloPedido pedido={pedido} /></div>
      <EtapasPedido pedido={pedido} />
      <section className="meus-pedidos-detalhe-secao" aria-labelledby="pedido-pecas-titulo">
        <h3 id="pedido-pecas-titulo">Peças do pedido</h3>
        {pedido.itens.length === 0 && <p>Os itens deste pedido não estão disponíveis.</p>}
        <ul className="meus-pedidos-itens">
          {pedido.itens.map(item => <li key={item.id}>
            <FotoPedido key={item.imagem || item.id} item={item} />
            <div className="meus-pedidos-item-conteudo"><h4>{item.nome}</h4><p>{item.quantidade} {item.quantidade === 1 ? 'unidade' : 'unidades'} · {valorEmReais(item.precoUnitarioCentavos)} cada</p>{item.personalizacao && <p className="meus-pedidos-item-personalizacao">Personalização: {item.personalizacao}</p>}<ReferenciasPedido referencias={item.referencias} /></div>
          </li>)}
        </ul>
      </section>
      <section className="meus-pedidos-detalhe-secao" aria-labelledby="pedido-valores-titulo">
        <h3 id="pedido-valores-titulo">Valores e pagamento</h3>
        <dl className="meus-pedidos-valores">
          <div><dt>Subtotal</dt><dd>{valorEmReais(pedido.subtotalCentavos)}</dd></div>
          <div><dt>Frete</dt><dd>{valorEmReais(pedido.freteCentavos)}</dd></div>
          {pedido.descontoCentavos > 0 && <div><dt>Desconto</dt><dd>− {valorEmReais(pedido.descontoCentavos)}</dd></div>}
          <div className="meus-pedidos-total"><dt>Total do pedido</dt><dd>{valorEmReais(pedido.totalCentavos)}</dd></div>
          <div><dt>Forma de pagamento</dt><dd>{pedido.formaPagamento || 'Não informada'}</dd></div>
          <div><dt>Pagamento</dt><dd>{pedido.pagamentoRotulo}</dd></div>
          {pedido.datas?.pagoEm && <div><dt>Pago em</dt><dd>{dataDoPedido(pedido.datas.pagoEm)}</dd></div>}
        </dl>
      </section>
      <section className="meus-pedidos-detalhe-secao" aria-labelledby="pedido-entrega-titulo">
        <h3 id="pedido-entrega-titulo">Entrega</h3>
        {temEndereco ? <address>{endereco.destinatario && <p>{endereco.destinatario}</p>}<p>{endereco.logradouro}, {endereco.numero}{endereco.complemento ? ' · ' + endereco.complemento : ''}</p>{endereco.bairro && <p>{endereco.bairro}</p>}<p>{endereco.cidade} · {endereco.uf} · CEP {formatarCep(endereco.cep)}</p>{endereco.referencia && <p>Referência: {endereco.referencia}</p>}</address> : <p>Endereço não informado neste pedido.</p>}
        {pedido.modalidadeFrete && <p>Serviço de entrega: {pedido.modalidadeFrete}</p>}
        {pedido.prazoEstimadoDias !== null && pedido.prazoEstimadoDias !== undefined && <p>Prazo registrado no pedido: {pedido.prazoEstimadoDias} dias úteis.</p>}
        {pedido.codigoRastreio ? <p className="meus-pedidos-rastreio">Código de rastreio: <strong>{pedido.codigoRastreio}</strong></p> : <p>O código de rastreio será exibido quando estiver disponível.</p>}
        {pedido.datas?.enviadoEm && <p>Enviado em {dataDoPedido(pedido.datas.enviadoEm)}.</p>}
        {pedido.datas?.entregueEm && <p>Entregue em {dataDoPedido(pedido.datas.entregueEm)}.</p>}
        {pedido.datas?.canceladoEm && <p>Cancelado em {dataDoPedido(pedido.datas.canceladoEm)}.</p>}
      </section>
      {pedido.observacaoCliente && <section className="meus-pedidos-detalhe-secao"><h3>Sua observação</h3><p className="meus-pedidos-observacao">{pedido.observacaoCliente}</p></section>}
      <button className="meu-perfil-primario" type="button" onClick={onFechar}>Fechar detalhes</button>
    </>
  )
}
function ConteudoPedidos({ usuarioId }) {
  const [pedidos, setPedidos] = useState([])
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [revisao, setRevisao] = useState(0)
  const [selecionado, setSelecionado] = useState(null)
  const dialogo = useRef(null)
  const acionador = useRef(null)

  useEffect(() => {
    const controle = new AbortController()
    carregarPedidosCliente(supabase, usuarioId, controle.signal)
      .then(lista => { if (!controle.signal.aborted) { setPedidos(lista); setErro(''); setCarregando(false) } })
      .catch(falha => { if (!controle.signal.aborted) { setErro(falha.message || 'Não foi possível carregar seus pedidos. Tente novamente.'); setCarregando(false) } })
    supabase.from('perfis').select('nome_completo').eq('id', usuarioId).maybeSingle().abortSignal(controle.signal)
      .then(({ data, error }) => { if (!controle.signal.aborted && !error) setNome(data?.nome_completo || '') })
      .catch(() => {})
    return () => controle.abort()
  }, [usuarioId, revisao])

  useEffect(() => {
    if (selecionado && dialogo.current && !dialogo.current.open) dialogo.current.showModal()
  }, [selecionado])

  function abrirDetalhes(pedido, botao) { acionador.current = botao; setSelecionado(pedido) }
  function fecharDetalhes() {
    dialogo.current?.close()
    setSelecionado(null)
    acionador.current?.focus()
  }
  function atualizar() {
    fecharDetalhes()
    setCarregando(true)
    setErro('')
    setRevisao(valor => valor + 1)
  }
  const visiveis = filtro === 'todos' ? pedidos : pedidos.filter(pedido => pedido.estado.chave === filtro)

  return (
    <EstruturaPedidos>
      <div className="meu-perfil-conteudo">
        <MenuContaCliente nomeCompleto={nome} atual="pedidos" />
        <section className="meus-pedidos-resultados" aria-label="Seus pedidos" aria-busy={carregando}>
          <div className="meus-pedidos-filtros" role="group" aria-label="Filtrar pedidos por etapa">
            {FILTROS_PEDIDOS_CLIENTE.map(({chave, rotulo}) => <button key={chave} type="button" aria-pressed={filtro === chave} onClick={() => setFiltro(chave)}>{rotulo}</button>)}
            <button className="meus-pedidos-atualizar" type="button" onClick={atualizar} disabled={carregando} aria-label="Atualizar pedidos" title="Atualizar pedidos"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.8-1L20 9M4 15l2.1 3A7 7 0 0 0 17.9 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          </div>
          {carregando ? <p className="meu-perfil-estado" role="status">Carregando seus pedidos...</p>
            : erro ? <div className="meu-perfil-estado" role="alert"><h2>Não foi possível carregar seus pedidos</h2><p>{erro}</p><button className="meu-perfil-primario" type="button" onClick={atualizar}>Tentar novamente</button></div>
            : <>
              <p className="meus-pedidos-sr" role="status">{visiveis.length} {visiveis.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}.</p>
              {visiveis.length > 0
                ? <div className="meus-pedidos-lista">{visiveis.map(pedido => <CartaoPedido key={pedido.id} pedido={pedido} onDetalhes={abrirDetalhes} />)}</div>
                : <div className="meus-pedidos-vazio"><h2>{pedidos.length ? 'Nenhum pedido nesta etapa' : 'Seus próximos mimos começam aqui'}</h2><p>{pedidos.length ? 'Você pode acompanhar as outras etapas selecionando outro filtro.' : 'Você ainda não tem pedidos nesta conta. Quando um pedido for registrado, ele aparecerá aqui.'}</p>{pedidos.length ? <button className="meu-perfil-secundario" type="button" onClick={() => setFiltro('todos')}>Ver todos os pedidos</button> : <Link className="meu-perfil-primario" to="/catalogo">Conhecer o catálogo</Link>}</div>}
            </>}
        </section>
      </div>
      <dialog className="meu-perfil-dialogo meus-pedidos-dialogo" ref={dialogo} aria-labelledby="meus-pedidos-dialogo-titulo" onCancel={evento => { evento.preventDefault(); fecharDetalhes() }}>
        {selecionado && <DetalhesPedido pedido={selecionado} onFechar={fecharDetalhes} />}
      </dialog>
    </EstruturaPedidos>
  )
}

export default function MeusPedidos() {
  const [sessao, setSessao] = useState(() => supabase ? undefined : null)
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, novaSessao) => setSessao(novaSessao))
    return () => subscription.unsubscribe()
  }, [])
  if (sessao === undefined) return <EstruturaPedidos><p className="meu-perfil-estado" role="status">Verificando sua conta...</p></EstruturaPedidos>
  if (!sessao?.user) return <Navigate to="/login" replace state={{ origem: '/meus-pedidos' }} />
  return <ConteudoPedidos key={sessao.user.id} usuarioId={sessao.user.id} />
}

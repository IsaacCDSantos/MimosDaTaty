import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCarrinho } from '../../carrinho/useCarrinho'
import { useCotacaoFrete } from '../../carrinho/useCotacaoFrete'
import { cepValido } from '../../servicos/freteModelo'
import { supabase } from '../../servicos/supabase'
import { operarCheckout } from '../../servicos/checkout'
import { etapaDoCheckout } from '../../servicos/checkoutModelo'
import CartaoMercadoPago from './CartaoMercadoPago'
import './Checkout.css'

const moeda = centavos => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
const formatarCep = valor => { const numeros = String(valor || '').replace(/\D/g, '').slice(0, 8); return numeros.length > 5 ? numeros.slice(0, 5) + '-' + numeros.slice(5) : numeros }
const prazo = opcao => opcao.prazoMinDias === opcao.prazoMaxDias ? opcao.prazoMaxDias + ' dia(s) úteis' : opcao.prazoMinDias + ' a ' + opcao.prazoMaxDias + ' dias úteis'
const finais = ['recusado', 'cancelado', 'expirado', 'estornado']
const rotulos = { preparado: 'Confira os dados e conclua o pagamento', processando: 'Estamos verificando seu pagamento', pendente: 'Aguardando confirmação do pagamento', aprovado: 'Pagamento aprovado!', recusado: 'Pagamento não aprovado', cancelado: 'Pagamento cancelado', expirado: 'Pagamento expirado', estornado: 'Pagamento estornado ou contestado' }

export default function Checkout({ aoNavegar }) {
  const navigate = useNavigate()
  const { itens, subtotalCentavos } = useCarrinho()
  const [conta, setConta] = useState(null)
  const [authVerificada, setAuthVerificada] = useState(false)
  const [config, setConfig] = useState(null)
  const [metodo, setMetodo] = useState('cartao_credito')
  const [endereco, setEndereco] = useState({ nome: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' })
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [pagamento, setPagamento] = useState(null)
  const [retomada, setRetomada] = useState(null)
  const [recuperacaoVerificada, setRecuperacaoVerificada] = useState(null)
  const [tentativaRecuperacao, setTentativaRecuperacao] = useState(0)
  const [tokenPreparadoPara, setTokenPreparadoPara] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const bloqueio = useRef(false)
  const versaoPagamento = useRef(0)
  const chave = useRef(null)
  const cartao = useRef(null)
  const token = useRef(null)
  const formulario = useRef(null)
  const frete = useCotacaoFrete(itens, endereco.cep)
  const atual = pagamento?.dono === conta?.id ? pagamento : null
  const subtotal = frete.situacao === 'pronto' ? frete.cotacao.subtotalCentavos : subtotalCentavos
  const total = atual?.totalCentavos ?? subtotal + (frete.selecionada?.precoCentavos || 0)
  const navegar = destino => typeof aoNavegar === 'function' ? aoNavegar(destino) : navigate(destino)
  const armazenamento = conta ? 'mimos-checkout-' + conta.id : null
  const sessaoAtual = atual?.sessaoId
  const estadoAtual = atual?.estado
  const recuperando = !authVerificada || Boolean(conta && recuperacaoVerificada !== conta.id)
  const etapa = etapaDoCheckout(atual, recuperando, Boolean(retomada && retomada.dono === conta?.id && retomada.sessaoId === atual?.sessaoId))
  const podeTrocar = atual && (atual.estado === 'preparado' || (atual.metodo === 'pix' && ['pendente', 'processando'].includes(atual.estado) && atual.orderId))

  useEffect(() => {
    let ativo = true
    operarCheckout('configuracao').then(dados => { if (ativo) setConfig(dados) }).catch(() => { if (ativo) setConfig({ configurado: false }) })
    if (!supabase) { Promise.resolve().then(() => { if (ativo) setAuthVerificada(true) }); return () => { ativo = false } }
    supabase.auth.getUser().then(({ data }) => { if (ativo) { setConta(data.user); setAuthVerificada(true) } }).catch(() => { if (ativo) setAuthVerificada(true) })
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => { if (ativo) { setConta(sessao?.user || null); setAuthVerificada(true) } })
    return () => { ativo = false; data.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!armazenamento || !conta?.id) return
    let ativo = true
    let id
    try { id = sessionStorage.getItem(armazenamento) } catch { /* A compra funciona sem armazenamento local. */ }
    if (id) operarCheckout('consultar', { sessaoId: id }).then(dados => {
      if (!ativo) return
      if (dados.formulario) { setEndereco({ ...dados.formulario.endereco, cep: formatarCep(dados.formulario.endereco.cep) }); setCpf(dados.formulario.cpf); setTelefone(dados.formulario.telefone) }
      if (finais.includes(dados.estado)) {
        try { sessionStorage.removeItem(armazenamento) } catch { /* A recuperação não depende da limpeza local. */ }
        setPagamento(null)
      } else {
        setPagamento({ ...dados, dono: conta.id })
        setRetomada({ sessaoId: dados.sessaoId, dono: conta.id })
      }
      setRecuperacaoVerificada(conta.id)
    }).catch(erro => {
      if (!ativo) return
      if (['NAO_ENCONTRADO', 'SESSAO_INVALIDA'].includes(erro.codigo)) {
        try { sessionStorage.removeItem(armazenamento) } catch { /* Não bloquear a interface. */ }
        setRecuperacaoVerificada(conta.id)
      } else setMensagem('Não foi possível verificar a tentativa anterior. Tente novamente para continuar com segurança.')
    })
    else Promise.resolve().then(() => { if (ativo) setRecuperacaoVerificada(conta.id) })
    return () => { ativo = false }
  }, [armazenamento, conta?.id, tentativaRecuperacao])
  useEffect(() => {
    if (!sessaoAtual || !['pendente', 'processando'].includes(estadoAtual)) return
    let ativo = true
    let consultando = false
    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible' || consultando || bloqueio.current) return
      consultando = true
      const versao = versaoPagamento.current
      try { const dados = await operarCheckout('consultar', { sessaoId: sessaoAtual }); if (ativo && versao === versaoPagamento.current) setPagamento({ ...dados, dono: conta.id }) }
      catch { /* O botão de consulta permite tentar novamente sem outra cobrança. */ }
      finally { consultando = false }
    }, 10000)
    return () => { ativo = false; clearInterval(timer) }
  }, [sessaoAtual, estadoAtual, conta?.id])

  function guardar(dados) {
    setPagamento({ ...dados, dono: conta.id })
    try { sessionStorage.setItem(armazenamento, dados.sessaoId) } catch { /* Não armazenar dados pessoais ou tokens no navegador. */ }
  }
  async function executar(operacao) {
    if (bloqueio.current) return
    bloqueio.current = true; versaoPagamento.current++; setOcupado(true); setMensagem('')
    try { await operacao() }
    catch (erro) { setMensagem(erro.message || 'Não foi possível confirmar o pagamento.') }
    finally { bloqueio.current = false; setOcupado(false) }
  }
  async function preparar(evento) {
    evento.preventDefault()
    if (!frete.selecionada || !conta || recuperacaoVerificada !== conta.id) return
    await executar(async () => {
      if (chave.current?.dono !== conta.id) chave.current = { dono: conta.id, id: crypto.randomUUID() }
      guardar(await operarCheckout('preparar', { chave: chave.current.id, itens: itens.map(i => ({ pecaId: i.id, quantidade: i.quantidade })), endereco, cpf, telefone, metodo, servicoFrete: frete.selecionada.id, totalExibidoCentavos: total }))
    })
  }
  async function pagar() {
    await executar(async () => {
      if (atual.metodo === 'cartao_credito' && token.current?.sessaoId !== atual.sessaoId) {
        if (!cartao.current) throw new Error('Aguarde os campos do cartão carregarem antes de pagar.')
        token.current = { sessaoId: atual.sessaoId, dados: await cartao.current.tokenizar() }
        setTokenPreparadoPara(atual.sessaoId)
      }
      try { guardar(await operarCheckout('pagar', { sessaoId: atual.sessaoId, pagamento: token.current?.dados })) }
      catch (erro) {
        try { guardar(await operarCheckout('consultar', { sessaoId: atual.sessaoId })) } catch { /* Preservar a tentativa e a mesma chave. */ }
        throw erro
      }
    })
  }
  function novaTentativa() {
    versaoPagamento.current++; chave.current = null; token.current = null; setTokenPreparadoPara(null); setPagamento(null); setRetomada(null); setMensagem('')
    try { sessionStorage.removeItem(armazenamento) } catch { /* Não bloquear a interface. */ }
  }
  async function trocarPagamento() {
    await executar(async () => {
      const resultado = await operarCheckout('cancelar', { sessaoId: atual.sessaoId })
      if (!resultado.cancelado) {
        guardar(resultado)
        setMensagem(resultado.estado === 'aprovado' ? 'O pagamento já foi aprovado. Confira seu pedido abaixo.' : 'O cancelamento ainda está em verificação. Consulte o pagamento ou tente novamente.')
        return
      }
      if (resultado.formulario) { setEndereco({ ...resultado.formulario.endereco, cep: formatarCep(resultado.formulario.endereco.cep) }); setCpf(resultado.formulario.cpf); setTelefone(resultado.formulario.telefone) }
      novaTentativa()
      setMensagem('Tentativa cancelada. Escolha a forma de pagamento e confira seus dados para continuar.')
    })
  }
  const alterar = campo => evento => setEndereco(anterior => ({ ...anterior, [campo]: evento.target.value }))
  const campo = (nome, titulo, extra = {}) => <div className="form-group flex-1"><label htmlFor={'checkout-' + nome}>{titulo}</label><input id={'checkout-' + nome} value={endereco[nome]} onChange={alterar(nome)} required maxLength={150} {...extra} /></div>

  return <div className="checkout-container">
    <nav className="checkout-nav" aria-label="Navegação do checkout">{[['/', 'Início'], ['/catalogo', 'Catálogo'], ['/#sobre', 'Sobre Nós'], ['/#contato', 'Contato']].map(([destino, texto]) => <button key={destino} type="button" className="nav-btn" onClick={() => navegar(destino)}>{texto}</button>)}</nav>
    <div className="checkout-content">
      <aside className="card-resumo">
        <h2 className="script-title">Resumo</h2><p className="card-subtitle">{atual ? 'Valores registrados para este pedido.' : 'Confira os valores antes de finalizar.'}</p>
        {!atual && <div className="resumo-linhas"><div className="resumo-linha"><span>Subtotal</span><strong>{moeda(subtotal)}</strong></div><div className="resumo-linha"><span>Frete</span><strong>{frete.selecionada ? moeda(frete.selecionada.precoCentavos) : 'A calcular'}</strong></div></div>}
        <div className="resumo-total"><span>{atual || frete.selecionada ? 'Total' : 'Total parcial'}</span><span className="valor-total">{moeda(total)}</span></div>
        <p className="total-obs">{atual ? 'Inclui o envio escolhido. Os juros de parcelamento, quando houver, aparecem nas opções do cartão.' : 'Selecione o frete para incluir o envio no total.'}</p>
        {!atual && <button type="button" className="btn-editar-carrinho" onClick={() => navegar('/carrinho')}>Editar carrinho</button>}
        {atual && <p className="frete-detalhe">Pedido {atual.numeroPedido || atual.pedidoId}</p>}
      </aside>
      <section className="card-checkout" aria-busy={ocupado || recuperando}>
        <h1 className="script-title">Checkout</h1><p className="card-subtitle">Finalize sua encomenda com carinho e segurança.</p>
        <div className="checkout-avisos">
        {config?.ambiente === 'sandbox' && <p className="frete-aviso" role="status">Ambiente de teste. Use somente os dados de teste do Mercado Pago.</p>}
        {config && !config.configurado && <p className="frete-aviso" role="status">O pagamento está temporariamente indisponível. Tente novamente em instantes.</p>}
        {authVerificada && !conta && <p className="frete-aviso">Para finalizar, <Link to="/login" state={{ origem: '/checkout' }}>entre na sua conta</Link>.</p>}
        {mensagem && <p className="frete-aviso" role="alert">{mensagem}</p>}
        </div>
        <div className="checkout-etapa">
        {etapa === 'verificando' ? <div className="checkout-recuperacao" role="status"><p>{mensagem ? 'Verifique a tentativa anterior antes de iniciar outro pagamento.' : 'Verificando sua conta e possíveis pagamentos em andamento…'}</p>{mensagem && conta && <button type="button" className="btn-calcular-frete" onClick={() => { setMensagem(''); setTentativaRecuperacao(valor => valor + 1) }}>Verificar tentativa anterior</button>}</div> : etapa === 'retomada' ? <section className="checkout-retomada" aria-labelledby="checkout-retomada-titulo">
          <h2 id="checkout-retomada-titulo" className="secao-titulo">Você tem um pagamento em andamento</h2>
          <p className="frete-detalhe">{atual.metodo === 'pix' && atual.estado === 'pendente' ? 'O Pix anterior continua aguardando pagamento. Escolha como deseja continuar.' : 'Uma tentativa anterior está registrada. Você pode retomá-la para conferir os próximos passos.'}</p>
          <div className="checkout-acoes">
            <button type="button" className="btn-pagar" disabled={ocupado} onClick={() => setRetomada(null)}>{atual.metodo === 'pix' && atual.estado === 'pendente' ? 'Continuar com este Pix' : 'Continuar pagamento'}</button>
            {podeTrocar && <button type="button" className="btn-trocar-pagamento" disabled={ocupado} onClick={trocarPagamento}>{ocupado ? 'Aguarde…' : atual.estado === 'preparado' ? 'Alterar dados ou forma de pagamento' : 'Cancelar Pix e escolher outro pagamento'}</button>}
            <button type="button" className="btn-editar-carrinho" disabled={ocupado} onClick={() => navegar('/carrinho')}>Voltar ao carrinho</button>
          </div>
          {podeTrocar && atual.estado !== 'preparado' && <p className="frete-detalhe">Para trocar a forma de pagamento, primeiro confirmaremos o cancelamento deste Pix.</p>}
        </section> : etapa === 'formulario' ? <form ref={formulario} onSubmit={preparar}>
          {!itens.length && <p className="frete-aviso">Seu carrinho está vazio. <Link to="/catalogo">Escolher peças</Link></p>}
          <fieldset disabled={ocupado} className="checkout-campos"><legend className="secao-titulo">Forma de pagamento</legend><div className="opcoes-pagamento">
            {[['cartao_credito', 'Cartão de crédito', 'Consulte as parcelas disponíveis.'], ['pix', 'Pix', 'QR Code e copia e cola nesta tela.']].map(([valor, nome, descricao]) => <label className={'opcao-card ' + (metodo === valor ? 'ativo' : '')} key={valor}><input type="radio" name="forma-pagamento" value={valor} checked={metodo === valor} onChange={() => setMetodo(valor)} /><span><strong>{nome}</strong><small>{descricao}</small></span></label>)}
          </div></fieldset>
          <fieldset disabled={ocupado} className="checkout-campos"><legend className="secao-titulo">Seus dados e endereço de entrega</legend>
            {campo('nome', 'Nome completo', { autoComplete: 'name' })}
            <div className="form-row"><div className="form-group flex-1"><label htmlFor="checkout-cpf">CPF</label><input id="checkout-cpf" inputMode="numeric" value={cpf} onChange={e => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))} required pattern="[0-9]{11}" maxLength={11} /></div><div className="form-group flex-1"><label htmlFor="checkout-telefone">Telefone com DDD</label><input id="checkout-telefone" type="tel" autoComplete="tel-national" value={telefone} onChange={e => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 11))} required pattern="[0-9]{10,11}" maxLength={11} /></div></div>
            {campo('logradouro', 'Rua ou avenida', { autoComplete: 'address-line1' })}
            <div className="form-row">{campo('numero', 'Número', { maxLength: 20 })}{campo('complemento', 'Complemento (opcional)', { required: false, maxLength: 100 })}</div>
            {campo('bairro', 'Bairro')}
            <div className="form-row">{campo('cidade', 'Cidade', { autoComplete: 'address-level2' })}{campo('uf', 'Estado (UF)', { maxLength: 2, pattern: '[A-Za-z]{2}', autoComplete: 'address-level1' })}</div>
            <div className="form-group"><label htmlFor="checkout-cep">CEP</label><input id="checkout-cep" inputMode="numeric" autoComplete="postal-code" maxLength={9} required pattern="[0-9]{5}-?[0-9]{3}" value={endereco.cep} onChange={e => setEndereco(anterior => ({ ...anterior, cep: formatarCep(e.target.value) }))} /></div>
          </fieldset>
          <section className="secao-checkout frete-secao" aria-labelledby="frete-titulo" aria-busy={frete.situacao === 'carregando'}><h3 id="frete-titulo" className="secao-titulo">Entrega</h3>
            <button type="button" className="btn-calcular-frete" disabled={ocupado || !itens.length || !cepValido(endereco.cep) || frete.situacao === 'carregando'} onClick={frete.calcular}>{frete.situacao === 'carregando' ? 'Calculando frete…' : 'Calcular frete'}</button>
            {!cepValido(endereco.cep) && <p className="frete-detalhe">Preencha o CEP para calcular o envio.</p>}
            {frete.situacao === 'erro' && <p className="frete-aviso" role="alert">{frete.mensagem}</p>}{frete.situacao === 'expirado' && <p className="frete-aviso">A cotação expirou. Calcule novamente.</p>}
            {frete.situacao === 'pronto' && <fieldset disabled={ocupado} className="frete-opcoes"><legend>Escolha a forma de envio</legend>{frete.cotacao.opcoes.map(opcao => <label className="frete-opcao" key={opcao.id}><input type="radio" name="servico-frete" checked={frete.selecionada?.id === opcao.id} onChange={() => frete.selecionar(opcao.id)} /><span><strong>{opcao.nome} · {opcao.transportadora}</strong><small>Transporte: {prazo(opcao)}</small></span><strong>{moeda(opcao.precoCentavos)}</strong></label>)}</fieldset>}
          </section>
          <button type="submit" className="btn-pagar" disabled={ocupado || !conta || recuperacaoVerificada !== conta.id || !config?.configurado || !itens.length || !frete.selecionada}>{ocupado ? 'Conferindo pedido…' : 'Conferir e continuar'}</button>
          <p className="rodape-obs">Na próxima etapa, você conclui o pagamento aqui mesmo.</p>
        </form> : <section className="checkout-resultado" aria-live="polite">
          <h2 className="secao-titulo">{rotulos[atual.estado] || 'Pagamento em verificação'}</h2>
          {atual.estado === 'preparado' && <>{atual.metodo === 'cartao_credito' ? <CartaoMercadoPago publicKey={config?.publicKey} totalCentavos={total} controle={cartao} bloqueado={ocupado} /> : <p className="frete-detalhe">Clique em gerar Pix para exibir o QR Code e o código copia e cola.</p>}<button className="btn-pagar" type="button" disabled={ocupado || !conta || !config?.configurado} onClick={pagar}>{ocupado ? 'Processando…' : atual.metodo === 'pix' ? 'Gerar Pix' : 'Pagar com cartão'}</button></>}
          {atual.estado === 'pendente' && atual.pixQrBase64 && <img className="checkout-pix-qr" src={'data:image/png;base64,' + atual.pixQrBase64} alt="QR Code para pagar o pedido com Pix" />}
          {atual.estado === 'pendente' && atual.pixCopiaCola && <><label htmlFor="checkout-pix-codigo">Pix copia e cola</label><textarea id="checkout-pix-codigo" readOnly value={atual.pixCopiaCola} rows={3} /><button type="button" className="btn-editar-carrinho" onClick={() => executar(async () => { await navigator.clipboard.writeText(atual.pixCopiaCola); setMensagem('Código Pix copiado.') })}>Copiar código Pix</button><p className="frete-detalhe">Pague no aplicativo do banco. A confirmação aparecerá aqui. Validade: {new Date(atual.expiraEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</p></>}
          {atual.estado === 'processando' && <p className="frete-detalhe">Sua tentativa está registrada. Consulte o resultado antes de iniciar outro pagamento.</p>}
          {atual.estado === 'processando' && !atual.orderId && (atual.metodo === 'pix' || tokenPreparadoPara === atual.sessaoId) && <button type="button" className="btn-pagar" disabled={ocupado} onClick={pagar}>Retomar a mesma tentativa</button>}
          {podeTrocar && <div className="checkout-trocar"><button type="button" className="btn-trocar-pagamento" disabled={ocupado} onClick={trocarPagamento}>{ocupado ? 'Aguarde…' : atual.estado === 'preparado' ? 'Alterar dados ou forma de pagamento' : 'Cancelar Pix e trocar forma de pagamento'}</button>{atual.estado !== 'preparado' && <p className="frete-detalhe">O Pix atual será cancelado antes de liberar uma nova tentativa.</p>}</div>}
          {atual.estado === 'aprovado' && <p className="frete-detalhe">Recebemos a confirmação do pagamento. Sua encomenda está registrada com o número acima.</p>}
          {finais.includes(atual.estado) && <button type="button" className="btn-pagar" disabled={ocupado} onClick={novaTentativa}>Voltar ao checkout</button>}
          {['pendente', 'processando'].includes(atual.estado) && <div className="checkout-status"><p className="frete-detalhe">A confirmação é verificada automaticamente. Você também pode atualizar o status agora.</p><button type="button" className="btn-calcular-frete checkout-consultar" disabled={ocupado} onClick={() => executar(async () => guardar(await operarCheckout('consultar', { sessaoId: atual.sessaoId })))}>Atualizar status do pagamento</button></div>}
          {atual.estado === 'aprovado' && <button type="button" className="btn-editar-carrinho" onClick={() => navegar('/catalogo')}>Voltar ao catálogo</button>}
        </section>}
        </div>
      </section>
    </div>
  </div>
}

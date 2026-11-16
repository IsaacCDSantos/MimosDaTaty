import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../servicos/supabase'
import { servicoPerfil } from '../../servicos/perfil'
import ContaHeader from '../../componentes/Header/ContaHeader'
import logo from '../../assets/imagens/logo-mimos-da-taty.png'
import './MeuPerfil.css'

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')
const camposEndereco = { destinatario: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' }
function formatarCep(valor) { const n = String(valor || '').replace(/\D/g, '').slice(0, 8); return n.length > 5 ? n.slice(0, 5) + '-' + n.slice(5) : n }
function formatarTelefone(valor) { const n = String(valor || '').replace(/\D/g, '').slice(0, 11); if (n.length < 3) return n; const corte = n.length > 10 ? 7 : 6; return '(' + n.slice(0, 2) + ') ' + n.slice(2, corte) + (n.length > corte ? '-' + n.slice(corte) : '') }
function iniciais(nome) { const partes = nome.trim().split(/\s+/).filter(Boolean); return (partes.length ? partes.slice(0, 2).map(parte => Array.from(parte)[0]).join('') : 'MC').toLocaleUpperCase('pt-BR') }
function CabecalhoPerfil() {
 const navigate = useNavigate()
 return <header className="meu-perfil-header"><div className="meu-perfil-header-conteudo">
  <Link className="meu-perfil-logo" to="/" aria-label="Mimos da Taty — início"><img src={logo} alt="Mimos da Taty" width="38" height="38" /></Link>
  <nav className="meu-perfil-header-nav" aria-label="Navegação da loja"><Link to="/">Início</Link><Link to="/catalogo">Catálogo</Link><Link to="/#sobre">Sobre nós</Link><Link to="/#contato">Contato</Link></nav>
  <div className="meu-perfil-header-acoes"><ContaHeader onEntrar={() => navigate('/login')} /><Link to="/carrinho">Carrinho</Link></div>
 </div></header>
}
function EstruturaPerfil({ children }) { return <div className="meu-perfil-page"><CabecalhoPerfil /><main className="meu-perfil-main"><p className="meu-perfil-eyebrow">MINHA CONTA</p><h1>Meu perfil</h1><p className="meu-perfil-descricao">Seus dados, com todo o cuidado que você merece.</p>{children}</main><footer className="meu-perfil-footer">Feito à mão, pensado para você. · Mimos da Taty</footer></div> }

function ConteudoPerfil({ usuarioId }) {
 const [dados, setDados] = useState(null)
 const [formulario, setFormulario] = useState({ nomeCompleto: '', telefone: '' })
 const [carregando, setCarregando] = useState(true)
 const [erroCarga, setErroCarga] = useState('')
 const [revisao, setRevisao] = useState(0)
 const [ocupado, setOcupado] = useState(false)
 const [confirmacaoPendente, setConfirmacaoPendente] = useState(false)
 const [mensagem, setMensagem] = useState('')
 const [erro, setErro] = useState('')
 const [enderecoForm, setEnderecoForm] = useState(camposEndereco)
 const [erroEndereco, setErroEndereco] = useState('')
 const dialogo = useRef(null)
 const botaoEndereco = useRef(null)
 const devolverFocoEndereco = useRef(false)
 const operacao = useRef(false)
 const montado = useRef(false)
 useEffect(() => { if (!ocupado && devolverFocoEndereco.current) { devolverFocoEndereco.current = false; botaoEndereco.current?.focus() } }, [ocupado])
 const bloqueado = ocupado || confirmacaoPendente
 useEffect(() => { montado.current = true; return () => { montado.current = false } }, [])
 useEffect(() => {
  let ativo = true
  servicoPerfil.carregarPerfil(usuarioId).then(perfil => { if (ativo) { setDados(perfil); setFormulario({ nomeCompleto: perfil.nomeCompleto, telefone: formatarTelefone(perfil.telefone) }); setErroCarga(''); setConfirmacaoPendente(false); setCarregando(false) } }).catch(falha => { if (ativo) { setErroCarga(falha.message || 'Não foi possível carregar seu perfil.'); setCarregando(false) } })
  return () => { ativo = false }
 }, [usuarioId, revisao])
 function recarregar() { if (operacao.current) return; if (dialogo.current?.open) dialogo.current.close(); setCarregando(true); setErro(''); setMensagem(''); setErroEndereco(''); setRevisao(n => n + 1) }
 function atualizarCampo(e) { setErro(''); setMensagem(''); const { name, value } = e.target; setFormulario(atual => ({ ...atual, [name]: name === 'telefone' ? formatarTelefone(value) : value })) }
 async function salvarDados(e) {
  e.preventDefault()
  if (operacao.current || confirmacaoPendente) return
  operacao.current = true; setOcupado(true); setErro(''); setMensagem('')
  try { const atualizado = await servicoPerfil.salvarDadosPessoais(formulario, usuarioId); if (montado.current) { setDados(atual => ({ ...atual, ...atualizado })); setFormulario({ nomeCompleto: atualizado.nomeCompleto, telefone: formatarTelefone(atualizado.telefone) }); setMensagem('Alterações salvas.'); window.dispatchEvent(new Event('mimos:perfil-atualizado')) } }
  catch (falha) { if (montado.current) { setErro(falha.message || 'Não foi possível salvar. Seus dados foram mantidos para tentar novamente.'); if (falha.resultadoIncerto) setConfirmacaoPendente(true) } }
  finally { operacao.current = false; if (montado.current) setOcupado(false) }
 }
 function cancelarDados() { if (bloqueado) return; setFormulario({ nomeCompleto: dados.nomeCompleto, telefone: formatarTelefone(dados.telefone) }); setErro(''); setMensagem('Alterações não salvas foram descartadas.') }
 function abrirEndereco() { if (bloqueado) return; setEnderecoForm({ ...camposEndereco, ...dados.endereco, destinatario: dados.endereco?.destinatario || dados.nomeCompleto, cep: formatarCep(dados.endereco?.cep), complemento: dados.endereco?.complemento || '' }); setErroEndereco(''); if (!dialogo.current.open) dialogo.current.showModal() }
 function fecharEndereco() { if (ocupado) return; dialogo.current.close(); setErroEndereco(''); botaoEndereco.current?.focus() }
 async function salvarEndereco(e) {
  e.preventDefault()
  if (operacao.current || confirmacaoPendente) return
  operacao.current = true; setOcupado(true); setErroEndereco(''); setMensagem('')
  try { const endereco = await servicoPerfil.salvarEndereco(enderecoForm, usuarioId, dados.endereco?.id || null); if (montado.current) { setDados(atual => ({ ...atual, endereco })); devolverFocoEndereco.current = true; dialogo.current.close(); setMensagem('Endereço de entrega salvo.') } }
  catch (falha) { if (montado.current) { setErroEndereco(falha.message || 'Não foi possível salvar o endereço. Tente novamente.'); if (falha.resultadoIncerto) setConfirmacaoPendente(true) } }
  finally { operacao.current = false; if (montado.current) setOcupado(false) }
 }
 if (carregando) return <EstruturaPerfil><div className="meu-perfil-estado" role="status">Carregando seus dados...</div></EstruturaPerfil>
 if (erroCarga || !dados) return <EstruturaPerfil><section className="meu-perfil-estado" role="alert"><p>{erroCarga || 'Seu perfil não está disponível.'}</p><button className="meu-perfil-primario" onClick={recarregar}>Tentar novamente</button><Link to="/login">Entrar na conta</Link></section></EstruturaPerfil>
 const nome = dados.nomeCompleto || 'Minha conta'
 const endereco = dados.endereco
 return <EstruturaPerfil><div className="meu-perfil-conteudo">
  <aside className="meu-perfil-sidebar" aria-label="Minha conta"><div className="meu-perfil-sidebar-topo"><div className="meu-perfil-iniciais" aria-hidden="true">{iniciais(nome)}</div><div><h2>{dados.nomeCompleto ? 'Olá, ' + dados.nomeCompleto.split(/\s+/)[0] + '!' : 'Olá!'}</h2><p>Seu cantinho no ateliê</p></div></div><nav className="meu-perfil-sidebar-nav" aria-label="Navegação da conta"><Link to="/meu-perfil" aria-current="page">Perfil</Link><button type="button" disabled title="Disponível em breve" aria-label="Meus pedidos — disponível em breve">Meus pedidos</button><Link className="meu-perfil-voltar" to="/">Voltar à loja</Link></nav></aside>
  <section className="meu-perfil-card" aria-labelledby="perfil-dados-titulo"><h2 id="perfil-dados-titulo">Dados pessoais</h2>
   <form id="meu-perfil-form" onSubmit={salvarDados}><fieldset className="meu-perfil-campos" disabled={bloqueado}>
    <div className="meu-perfil-campo"><label htmlFor="perfil-nome">Nome completo</label><input id="perfil-nome" name="nomeCompleto" autoComplete="name" minLength={2} maxLength={120} required value={formulario.nomeCompleto} onChange={atualizarCampo} placeholder="Seu nome completo" /></div>
    <div className="meu-perfil-campo"><label htmlFor="perfil-telefone">Telefone</label><input id="perfil-telefone" type="tel" inputMode="tel" name="telefone" autoComplete="tel-national" maxLength={15} value={formulario.telefone} onChange={atualizarCampo} placeholder="(85) 90000-0000" /></div>
    <div className="meu-perfil-campo"><label htmlFor="perfil-email">E-mail da conta</label><input id="perfil-email" type="email" value={dados.email} readOnly aria-describedby="perfil-email-ajuda" autoComplete="email" /></div>
   </fieldset></form>
   <p className="meu-perfil-email-ajuda" id="perfil-email-ajuda">Seu e-mail identifica o acesso à conta.</p>
   <section className="meu-perfil-endereco" aria-labelledby="perfil-endereco-titulo"><div><h3 id="perfil-endereco-titulo">Endereço de entrega</h3>{endereco ? <><p>{endereco.logradouro}, {endereco.numero}{endereco.complemento ? ' · ' + endereco.complemento : ''}</p><p className="meu-perfil-endereco-local">{endereco.cidade}, {endereco.uf} · {formatarCep(endereco.cep)}</p></> : <p className="meu-perfil-endereco-local">Cadastre o endereço para receber seus mimos.</p>}</div><button className="meu-perfil-secundario" ref={botaoEndereco} type="button" onClick={abrirEndereco} disabled={bloqueado}>{endereco ? 'Editar endereço' : 'Adicionar endereço'}</button></section>
   {erro && <p className="meu-perfil-erro" role="alert">{erro}</p>}{mensagem && <p className="meu-perfil-mensagem" role="status">{mensagem}</p>}
   {confirmacaoPendente && <div className="meu-perfil-erro" role="alert"><p>Confira o resultado da última gravação antes de alterar novamente.</p><button className="meu-perfil-secundario" type="button" onClick={recarregar}>Recarregar dados</button></div>}
   <div className="meu-perfil-acoes"><button className="meu-perfil-primario" type="submit" form="meu-perfil-form" disabled={bloqueado}>{ocupado ? 'Salvando...' : 'Salvar alterações'}</button><button className="meu-perfil-secundario" type="button" onClick={cancelarDados} disabled={bloqueado}>Cancelar</button></div>
  </section>
 </div>
 <dialog className="meu-perfil-dialogo" ref={dialogo} aria-labelledby="perfil-dialogo-titulo" onCancel={e => { if (ocupado) e.preventDefault() }}><form onSubmit={salvarEndereco}><h2 id="perfil-dialogo-titulo">Endereço de entrega</h2><p>Informe onde você quer receber seus mimos.</p><fieldset className="meu-perfil-endereco-campos" disabled={bloqueado}>
  {[['destinatario','Destinatário','name',120],['cep','CEP','postal-code',9],['logradouro','Rua ou avenida','address-line1',150],['numero','Número','off',20],['complemento','Complemento (opcional)','address-line2',150],['bairro','Bairro','address-level3',100],['cidade','Cidade','address-level2',100]].map(([campo, rotulo, autocomplete, max]) => <div className={'meu-perfil-campo' + (['destinatario','logradouro','complemento'].includes(campo) ? ' meu-perfil-campo-largo' : '')} key={campo}><label htmlFor={'perfil-endereco-' + campo}>{rotulo}</label><input id={'perfil-endereco-' + campo} name={campo} autoComplete={autocomplete} inputMode={campo === 'cep' ? 'numeric' : 'text'} maxLength={max} required={campo !== 'complemento'} value={enderecoForm[campo]} onChange={e => { const value = campo === 'cep' ? formatarCep(e.target.value) : e.target.value; setEnderecoForm(atual => ({ ...atual, [campo]: value })); setErroEndereco('') }} /></div>)}
  <div className="meu-perfil-campo"><label htmlFor="perfil-endereco-uf">Estado</label><select id="perfil-endereco-uf" required value={enderecoForm.uf} onChange={e => { setEnderecoForm(atual => ({ ...atual, uf: e.target.value })); setErroEndereco('') }}><option value="">Selecione</option>{UFS.map(uf => <option key={uf}>{uf}</option>)}</select></div>
 </fieldset>{erroEndereco && <div className="meu-perfil-erro" role="alert"><p>{erroEndereco}</p>{!confirmacaoPendente && <button className="meu-perfil-secundario" type="button" onClick={recarregar}>Conferir dados salvos</button>}</div>}{confirmacaoPendente && <button className="meu-perfil-secundario" type="button" onClick={recarregar}>Recarregar dados para conferir</button>}<div className="meu-perfil-acoes"><button className="meu-perfil-primario" disabled={bloqueado} type="submit">{ocupado ? 'Salvando...' : 'Salvar endereço'}</button><button className="meu-perfil-secundario" disabled={ocupado} type="button" onClick={fecharEndereco}>Cancelar</button></div></form></dialog>
 </EstruturaPerfil>
}

export default function MeuPerfil() {
 const [sessao, setSessao] = useState(() => supabase ? undefined : null)
 useEffect(() => { if (!supabase) return; const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, novaSessao) => setSessao(novaSessao)); return () => subscription.unsubscribe() }, [])
 if (sessao === undefined) return <EstruturaPerfil><p className="meu-perfil-estado" role="status">Verificando sua conta...</p></EstruturaPerfil>
 if (!sessao?.user) return <Navigate to="/login" replace state={{ origem: '/meu-perfil' }} />
 return <ConteudoPerfil key={sessao.user.id} usuarioId={sessao.user.id} />
}

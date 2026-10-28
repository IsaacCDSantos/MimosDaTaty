import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../../servicos/supabase'
import './ContaHeader.css'

function IconeConta() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19c.4-3.2 2.85-5.5 6.5-5.5s6.1 2.3 6.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function MenuConta({ usuario }) {
  const [aberto, setAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [erro, setErro] = useState('')
  const [fotoFalhou, setFotoFalhou] = useState(false)
  const container = useRef(null)
  const botao = useRef(null)
  const painelId = useId()
  const nomeInformado = usuario.user_metadata?.nome || usuario.user_metadata?.full_name
  const nome = typeof nomeInformado === 'string' && nomeInformado.trim()
    ? nomeInformado.trim() : usuario.email?.split('@')[0] || 'Minha conta'
  const foto = usuario.user_metadata?.avatar_url
  const temFoto = typeof foto === 'string' && /^https:\/\//i.test(foto) && !fotoFalhou
  const iniciais = nome.split(/\s+/).slice(0, 2).map(parte => Array.from(parte)[0]).join('').toLocaleUpperCase('pt-BR')

  useEffect(() => {
    if (!aberto) return
    function fecharFora(event) {
      if (!container.current?.contains(event.target)) setAberto(false)
    }
    function fecharComEscape(event) {
      if (event.key === 'Escape') {
        setAberto(false)
        botao.current?.focus()
      }
    }
    document.addEventListener('pointerdown', fecharFora)
    document.addEventListener('keydown', fecharComEscape)
    return () => {
      document.removeEventListener('pointerdown', fecharFora)
      document.removeEventListener('keydown', fecharComEscape)
    }
  }, [aberto])

  async function sair() {
    if (saindo) return
    setSaindo(true)
    setErro('')
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch {
      setErro('Não foi possível sair. Tente novamente.')
      setSaindo(false)
    }
  }

  return (
    <div className="conta-header" ref={container}>
      <button
        className="conta-header-avatar"
        type="button"
        ref={botao}
        aria-label={`Conta de ${nome}`}
        aria-expanded={aberto}
        aria-controls={painelId}
        title={`Conectado como ${nome}`}
        onClick={() => setAberto(valor => !valor)}
      >
        {temFoto
          ? <img src={foto} alt="" referrerPolicy="no-referrer" onError={() => setFotoFalhou(true)} />
          : <span aria-hidden="true">{iniciais}</span>}
        <span className="conta-header-status" aria-hidden="true" />
      </button>
      {aberto && (
        <div className="conta-header-painel" id={painelId}>
          <div className="conta-header-identidade">
            <span className="conta-header-conectado">Você está conectado</span>
            <strong>{nome}</strong>
            <span className="conta-header-email">{usuario.email}</span>
          </div>
          <ul aria-label="Opções da conta">
            <li><button type="button" disabled>Perfil <span>Em breve</span></button></li>
            <li><button type="button" disabled>Meus pedidos <span>Em breve</span></button></li>
            <li><button type="button" className="conta-header-sair" disabled={saindo} onClick={sair}>{saindo ? 'Saindo…' : 'Sair'}</button></li>
          </ul>
          {erro && <p className="conta-header-erro" role="alert">{erro}</p>}
        </div>
      )}
    </div>
  )
}

export default function ContaHeader({ onEntrar }) {
  const [sessao, setSessao] = useState(() => supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_evento, novaSessao) => setSessao(novaSessao)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (sessao === undefined) {
    return <span className="conta-header-carregando" role="status" aria-label="Carregando conta"><IconeConta /></span>
  }
  if (sessao?.user) return <MenuConta key={sessao.user.id} usuario={sessao.user} />

  return (
    <a href="/login" aria-label="Entrar na conta" onClick={event => {
      event.preventDefault()
      onEntrar()
    }}>
      <IconeConta />
      <span>Login</span>
    </a>
  )
}

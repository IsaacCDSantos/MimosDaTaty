import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import RecuperacaoLayout from '../../componentes/RecuperacaoLayout/RecuperacaoLayout'
import { supabase } from '../../servicos/supabase'
import { solicitarRecuperacaoSenha } from '../../servicos/recuperacaoSenha'

const INTERVALO_REENVIO = 60_000

export default function ConfirmacaoEnvioEmail({ aoVoltar }) {
  const location = useLocation()
  const perfilQuery = new URLSearchParams(location.search).get('perfil') === 'admin' ? '?perfil=admin' : ''
  const email = location.state?.email || ''
  const [ultimoEnvio, setUltimoEnvio] = useState(location.state?.solicitadoEm || 0)
  const [agora, setAgora] = useState(Date.now)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const envioEmAndamento = useRef(false)
  const segundos = Math.max(0, Math.ceil((ultimoEnvio + INTERVALO_REENVIO - agora) / 1000))

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  async function reenviar() {
    if (!email || segundos > 0 || envioEmAndamento.current) return
    envioEmAndamento.current = true
    setEnviando(true)
    setAviso('')
    setErro('')
    try {
      const resultado = await solicitarRecuperacaoSenha(supabase, {
        email,
        origem: window.location.origin,
        perfil: perfilQuery ? 'admin' : 'cliente',
      })
      setUltimoEnvio(resultado.solicitadoEm)
      setAgora(resultado.solicitadoEm)
      setAviso('Solicitação de reenvio recebida. Se houver uma conta com esse endereço, confira sua caixa de entrada e a pasta de spam.')
    } catch (error) {
      setErro(error.message)
      if (import.meta.env.DEV) {
        console.warn('Falha ao reenviar recuperação de senha', {
          code: error?.code,
          status: error?.status,
          name: error?.name,
        })
      }
    } finally {
      envioEmAndamento.current = false
      setEnviando(false)
    }
  }

  return (
    <RecuperacaoLayout titulo="Confira seu e-mail" subtitulo="Um recadinho para você." descricao="Se houver uma conta com esse endereço, você receberá um link para redefinir sua senha." icone="email" seguro={false}>
      <div className="senha-dica"><strong>Não encontrou a mensagem?</strong><p>Abra sua caixa de entrada e confira também a pasta de spam. O link recebido no e-mail leva à criação de uma nova senha.</p></div>
      {aviso && <p className="senha-aviso" role="status">{aviso}</p>}
      {erro && <p className="senha-aviso" role="alert">{erro}</p>}
      {email && <button className="senha-link" type="button" onClick={reenviar} disabled={enviando || segundos > 0} aria-busy={enviando}>{enviando ? 'Solicitando reenvio…' : segundos > 0 ? 'Reenviar link em ' + segundos + 's' : 'Reenviar link'}</button>}
      <Link className="senha-link" to={'/recuperar-senha' + perfilQuery} state={{ email }}>Usar outro e-mail</Link>
      <Link className="senha-link" to={'/login' + perfilQuery} onClick={typeof aoVoltar === 'function' ? event => { event.preventDefault(); aoVoltar() } : undefined}>Voltar ao login</Link>
    </RecuperacaoLayout>
  )
}

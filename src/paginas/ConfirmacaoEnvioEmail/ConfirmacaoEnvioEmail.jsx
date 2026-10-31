import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import RecuperacaoLayout from '../../componentes/RecuperacaoLayout/RecuperacaoLayout'

const INTERVALO_REENVIO = 60_000

export default function ConfirmacaoEnvioEmail({ aoVoltar }) {
  const location = useLocation()
  const perfilQuery = new URLSearchParams(location.search).get('perfil') === 'admin' ? '?perfil=admin' : ''
  const email = location.state?.email || ''
  const [ultimoEnvio, setUltimoEnvio] = useState(location.state?.solicitadoEm || 0)
  const [agora, setAgora] = useState(Date.now)
  const [aviso, setAviso] = useState('')
  const segundos = Math.max(0, Math.ceil((ultimoEnvio + INTERVALO_REENVIO - agora) / 1000))

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  function reenviar() {
    if (!email || segundos > 0) return
    // Prévia visual: substituir pela solicitação real ao integrar manualmente.
    const instante = Date.now()
    setUltimoEnvio(instante)
    setAgora(instante)
    setAviso('Reenvio simulado. Nenhum e-mail foi enviado.')
  }

  return (
    <RecuperacaoLayout titulo="Confira seu e-mail" subtitulo="Um recadinho para você." descricao="Se houver uma conta com esse endereço, você receberá um link para redefinir sua senha." icone="email" seguro={false}>
      <div className="senha-dica"><strong>Não encontrou a mensagem?</strong><p>Abra sua caixa de entrada e confira também a pasta de spam. O link recebido no e-mail leva à criação de uma nova senha.</p></div>
      {aviso && <p className="senha-aviso" role="status">{aviso}</p>}
      {email && <button className="senha-link" type="button" onClick={reenviar} disabled={segundos > 0}>{segundos > 0 ? 'Reenviar link em ' + segundos + 's' : 'Reenviar link'}</button>}
      <Link className="senha-link" to={'/recuperar-senha' + perfilQuery} state={{ email }}>Usar outro e-mail</Link>
      <Link className="senha-link" to={'/login' + perfilQuery} onClick={typeof aoVoltar === 'function' ? event => { event.preventDefault(); aoVoltar() } : undefined}>Voltar ao login</Link>
    </RecuperacaoLayout>
  )
}

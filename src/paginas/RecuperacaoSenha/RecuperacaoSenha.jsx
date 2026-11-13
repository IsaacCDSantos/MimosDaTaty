import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import RecuperacaoLayout from '../../componentes/RecuperacaoLayout/RecuperacaoLayout'
import { supabase } from '../../servicos/supabase'

function mensagemFalhaRecuperacao(error) {
  switch (error?.code) {
    case 'over_email_send_rate_limit':
      return 'O limite de envio de e-mails foi atingido. Aguarde antes de solicitar outro link.'
    case 'over_request_rate_limit':
      return 'Foram feitas muitas solicitações. Aguarde um pouco antes de tentar novamente.'
    case 'email_address_not_authorized':
      return 'O serviço de e-mail ainda não permite enviar o link para este endereço. Entre em contato com o atendimento.'
    case 'email_provider_disabled':
      return 'A recuperação por e-mail está indisponível no momento. Entre em contato com o atendimento.'
    case 'request_timeout':
      return 'O serviço demorou para responder. Tente novamente em alguns instantes.'
    case 'captcha_failed':
      return 'Não foi possível concluir a verificação de segurança. Atualize a página e tente novamente.'
    default:
      if (error?.status === 429) {
        return 'O limite de solicitações foi atingido. Aguarde antes de tentar novamente.'
      }
      if (error?.name === 'AuthRetryableFetchError' && error.status === 0) {
        return 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.'
      }
      return 'Não foi possível solicitar o link. Tente novamente mais tarde. Se o problema continuar, entre em contato com o atendimento.'
  }
}

export default function RecuperacaoSenha({ aoVoltar, aoEnviar }) {
  const navigate = useNavigate()
  const location = useLocation()
  const perfilQuery = new URLSearchParams(location.search).get('perfil') === 'admin' ? '?perfil=admin' : ''
  const [email, setEmail] = useState(location.state?.email || '')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(event) {
  event.preventDefault()
  if (enviando) return

  const endereco = email.trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) {
    setErro('Informe um e-mail válido.')
    return
  }

  if (!supabase) {
    setErro('A recuperação está indisponível no momento.')
    return
  }

  setErro('')
  setEnviando(true)

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      endereco,
      {
        redirectTo: new URL(
          '/redefinir-senha',
          window.location.origin
        ).href,
      }
    )

    if (error) throw error

    const resultado = {
      email: endereco,
      solicitadoEm: Date.now(),
    }

    if (typeof aoEnviar === 'function') {
      aoEnviar(resultado)
    } else {
      navigate('/confirmacao' + perfilQuery, {
        state: resultado,
      })
    }
  } catch (error) {
    setErro(mensagemFalhaRecuperacao(error))
    if (import.meta.env.DEV) {
      // Não registrar e-mail, tokens ou a mensagem bruta retornada pelo serviço.
      console.warn('Falha ao solicitar recuperação de senha', {
        code: error?.code,
        status: error?.status,
        name: error?.name,
      })
    }
  } finally {
    setEnviando(false)
  }
}

  return (
    <RecuperacaoLayout titulo="Vamos recomeçar?" subtitulo="Recupere seu acesso" descricao="Informe o e-mail da sua conta para receber um link e criar uma nova senha.">
      <form className="senha-form" onSubmit={enviar}>
        <div className="senha-campo">
          <label htmlFor="recuperacao-email">E-mail cadastrado</label>
          <input id="recuperacao-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="nome@exemplo.com" required value={email} onChange={event => { setEmail(event.target.value); setErro('') }} aria-invalid={!!erro} aria-describedby={erro ? 'recuperacao-erro' : undefined} />
        </div>
        {erro && <p id="recuperacao-erro" className="senha-aviso" role="alert">{erro}</p>}
        <button className="senha-botao" type="submit" disabled={enviando}>
  {enviando ? 'Solicitando link…' : 'Enviar link de recuperação'}
</button>
      </form>
      <Link className="senha-link" to={'/login' + perfilQuery} onClick={typeof aoVoltar === 'function' ? event => { event.preventDefault(); aoVoltar() } : undefined}>← Voltar ao login</Link>
    </RecuperacaoLayout>
  )
}

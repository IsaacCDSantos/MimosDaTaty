import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import RecuperacaoLayout from '../../componentes/RecuperacaoLayout/RecuperacaoLayout'
import { supabase } from '../../servicos/supabase'

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
  } catch {
    setErro(
      'Não foi possível solicitar o link. Aguarde um pouco e tente novamente.'
    )
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

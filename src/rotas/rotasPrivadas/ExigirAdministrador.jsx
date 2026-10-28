import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../../servicos/supabase'
import { obterUsuarioAtual } from '../../servicos/autenticacao'

export default function ExigirAdministrador({ children }) {
  const location = useLocation()
  const [sessao, setSessao] = useState(() => supabase ? undefined : null)
  const [verificacao, setVerificacao] = useState(null)

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_evento, novaSessao) => {
        setSessao(novaSessao)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessao) return

    let ativo = true

    obterUsuarioAtual()
      .then((usuario) => {
        if (ativo) setVerificacao({ sessao, usuario })
      })
      .catch(() => {
        if (ativo) setVerificacao({ sessao, usuario: null })
      })

    return () => {
      ativo = false
    }
  }, [sessao])

  if (
    sessao === undefined ||
    (sessao && verificacao?.sessao !== sessao)
  ) {
    return <p role="status">Verificando acesso...</p>
  }

  const usuario = sessao ? verificacao?.usuario : null

  if (!usuario?.autenticado || usuario.perfil !== 'admin') {
    return (
      <Navigate
        to="/login?perfil=admin"
        replace
        state={{ origem: location.pathname }}
      />
    )
  }

  return children
}

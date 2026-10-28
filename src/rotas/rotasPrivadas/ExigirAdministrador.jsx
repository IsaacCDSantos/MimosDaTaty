import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../../servicos/supabase'
import { obterUsuarioAtual } from '../../servicos/autenticacao'

export default function ExigirAdministrador({ children }) {
  const location = useLocation()
  const [{ sessao, saiuDaConta }, setAutenticacao] = useState(() => ({
    sessao: supabase ? undefined : null,
    saiuDaConta: false,
  }))
  const [verificacao, setVerificacao] = useState(null)

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (evento, novaSessao) => {
        // A sessão é removida antes de signOut resolver. A guarda também
        // precisa respeitar o destino da saída, sem disputar com o botão.
        setAutenticacao({
          sessao: novaSessao,
          saiuDaConta: evento === 'SIGNED_OUT',
        })
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
        to={saiuDaConta ? '/' : '/login?perfil=admin'}
        replace
        state={{ origem: location.pathname }}
      />
    )
  }

  return children
}

import { Navigate, useLocation } from 'react-router-dom'

// Usuario deve vir de autenticacao verificada por um servico de backend.
// Query, perfil selecionado no login e storage nao comprovam autenticacao.
export default function ExigirAdministrador({ usuario = null, children }) {
  const location = useLocation()
  if (usuario?.autenticado !== true || usuario?.perfil !== 'admin') {
    return <Navigate to="/login?perfil=admin" replace state={{ origem: location.pathname }} />
  }
  return children
}

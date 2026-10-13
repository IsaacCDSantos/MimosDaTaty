import { Route } from 'react-router-dom'
import Inicio from '../../paginas/Inicio/Inicio'
import Auth from '../../paginas/Auth/Auth'

// Rotas públicas: acessíveis por qualquer usuário diretamente no navegador
export const rotasPublicas = (
  <>
    {/* Página Inicial */}
    <Route path="/" element={<Inicio />} />

    {/* Tela de Login (Usuário e Admin) */}
    <Route path="/login" element={<Auth />} />

    {/* Tela de Recuperação de Senha */}
    <Route path="/recuperar-senha" element={<Auth recovery={true} />} />
  </>
)

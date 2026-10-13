import { Route } from 'react-router-dom'
import Inicio from '../../paginas/Inicio/Inicio'
import Auth from '../../paginas/Auth/Auth'
import Checkout from '../../componentes/Checkout/Checkout'
import Recuperacao from '../../componentes/Recuperacao/Recuperacao'
import ConfirmacaoEnvio from '../../componentes/ConfirmacaoEnvio/ConfirmacaoEnvio'

// Rotas públicas: acessíveis por qualquer usuário diretamente no navegador
export const rotasPublicas = (
  <>
    {/* Página Inicial */}
    <Route path="/" element={<Inicio />} />

    {/* Tela de Login (Usuário e Admin) */}
    <Route path="/login" element={<Auth />} />

    {/* Tela de Recuperação de Senha */}
    <Route path="/recuperar-senha" element={<Auth recovery={true} />} />

    {/* Tela de checkout-pagamento */}
    <Route path="/checkout" element={<Checkout />} />
    {/* Tela de Recuperção de senha */}
    <Route path="/recuperacao" element={<Recuperacao />} />
    {/* Tela de confirmação de recuperação */}
    <Route path="/confirmacao" element={<ConfirmacaoEnvio />} />
  </>
)
import { Route } from 'react-router-dom'
import Inicio from '../../paginas/Inicio/Inicio'
import Login from '../../paginas/Login/Login'
import Carrinho from '../../componentes/Carrinho/Carrinho'
import Checkout from '../../componentes/Checkout/Checkout'
import RecuperacaoSenha from '../../componentes/RecuperacaoSenha/RecuperacaoSenha'
import ConfirmacaoEnvioEmail from '../../componentes/ConfirmacaoEnvioEmail/ConfirmacaoEnvioEmail'

// Rotas públicas: acessíveis por qualquer usuário diretamente no navegador
export const rotasPublicas = (
  <>
    {/* Página Inicial */}
    <Route path="/" element={<Inicio />} />

    {/* Tela de Login (Usuário e Admin) */}
    <Route path="/login" element={<Login />} />

    {/* Tela de Carrinho */}
    <Route path="/carrinho" element={<Carrinho />} />

    {/* Tela de Recuperação de Senha */}
    <Route path="/recuperar-senha" element={<RecuperacaoSenha />} />
    <Route path="/recuperacao" element={<RecuperacaoSenha />} />

    {/* Tela de confirmação de envio de e-mail */}
    <Route path="/confirmacao" element={<ConfirmacaoEnvioEmail />} />

    {/* Tela de checkout-pagamento */}
    <Route path="/checkout" element={<Checkout />} />
  </>
)
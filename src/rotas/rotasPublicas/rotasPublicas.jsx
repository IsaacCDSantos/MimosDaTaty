import { Route } from 'react-router-dom'
import Inicio from '../../paginas/Inicio/Inicio'
import Login from '../../paginas/Login/Login'
import Carrinho from '../../paginas/Carrinho/Carrinho'
import Checkout from '../../paginas/Checkout/Checkout'
import RecuperacaoSenha from '../../paginas/RecuperacaoSenha/RecuperacaoSenha'
import ConfirmacaoEnvioEmail from '../../paginas/ConfirmacaoEnvioEmail/ConfirmacaoEnvioEmail'
import Catalogo from '../../paginas/Catalogo/Catalogo'
import InicioAdmin from '../../paginas/Admin/InicioAdmin'
import { DADOS_ADMIN_DEMONSTRACAO } from '../../paginas/Admin/dadosDemonstracao'

// Rotas públicas: acessíveis por qualquer usuário diretamente no navegador
export const rotasPublicas = (
  <>
    {/* Página Inicial */}
    <Route path="/" element={<Inicio />} />

    {/* Tela de Login (Usuário e Admin) */}
    <Route path="/login" element={<Login />} />

    <Route path="/catalogo" element={<Catalogo />} />

    {/* Previa publica com dados ficticios, separada da area administrativa. */}
    <Route path="/previa/admin" element={<InicioAdmin dados={DADOS_ADMIN_DEMONSTRACAO} demonstracao />} />

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

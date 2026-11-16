import { Route } from 'react-router-dom'
import Inicio from '../../paginas/Inicio/Inicio'
import Login from '../../paginas/Login/Login'
import Cadastro from '../../paginas/Cadastro/Cadastro'
import Carrinho from '../../paginas/Carrinho/Carrinho'
import Checkout from '../../paginas/Checkout/Checkout'
import RecuperacaoSenha from '../../paginas/RecuperacaoSenha/RecuperacaoSenha'
import ConfirmacaoEnvioEmail from '../../paginas/ConfirmacaoEnvioEmail/ConfirmacaoEnvioEmail'
import RedefinirSenha from '../../paginas/RedefinirSenha/RedefinirSenha'
import Catalogo from '../../paginas/Catalogo/Catalogo'

// Rotas públicas: acessíveis por qualquer usuário diretamente no navegador
export const rotasPublicas = (
  <>
    {/* Página Inicial */}
    <Route path="/" element={<Inicio />} />

    {/* Tela de Login (Usuário e Admin) */}
    <Route path="/login" element={<Login />} />
    <Route path="/cadastro" element={<Cadastro />} />

    <Route path="/catalogo" element={<Catalogo />} />
    <Route path="/catalogo/:pecaSlug" element={<Catalogo />} />

    {/* Tela de Carrinho */}
    <Route path="/carrinho" element={<Carrinho />} />

    {/* Tela de Recuperação de Senha */}
    <Route path="/recuperar-senha" element={<RecuperacaoSenha />} />

    {/* Tela de confirmação de envio de e-mail */}
    <Route path="/confirmacao" element={<ConfirmacaoEnvioEmail />} />
    {/* Prévia visual. A validação do link e o salvamento serão integrados manualmente. */}
    <Route path="/redefinir-senha" element={<RedefinirSenha />} />

    {/* Tela de checkout-pagamento */}
    <Route path="/checkout" element={<Checkout />} />
  </>
)

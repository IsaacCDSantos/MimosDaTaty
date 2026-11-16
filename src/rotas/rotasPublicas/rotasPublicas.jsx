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
import InicioAdmin from '../../paginas/Admin/InicioAdmin'
import CatalogoAdmin from '../../paginas/Admin/CatalogoAdmin/CatalogoAdmin'
import CatalogoAdminProvider from '../../paginas/Admin/CatalogoAdmin/CatalogoAdminProvider'
import FormularioCatalogoAdmin from '../../paginas/Admin/CatalogoAdmin/FormularioCatalogoAdmin'
import { DADOS_ADMIN_DEMONSTRACAO } from '../../paginas/Admin/dadosDemonstracao'
import PedidosAdmin from '../../paginas/Admin/Pedidos/PedidosAdmin'
import { PEDIDOS_DEMONSTRACAO } from '../../paginas/Admin/Pedidos/pedidosDemonstracao'
import AdminEditarPeca from '../../paginas/Admin/EditarPeca/AdminEditarPeca'
import AdminAdicionarPeca from '../../paginas/Admin/AdicionarPeca/AdminAdicionarPeca'

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

    {/* A prévia compartilha somente produtos fictícios, mantidos em memória. */}
    <Route element={<CatalogoAdminProvider />}>
      <Route path="/previa/admin" element={<InicioAdmin dados={DADOS_ADMIN_DEMONSTRACAO} demonstracao />} />
      <Route path="/previa/admin/pedidos" element={<PedidosAdmin pedidosIniciais={PEDIDOS_DEMONSTRACAO} demonstracao />} />
      <Route path="/previa/admin/catalogo" element={<CatalogoAdmin demonstracao />} />
      <Route path="/previa/admin/editar-peca" element={<FormularioCatalogoAdmin editar demonstracao />} />
      <Route path="/previa/admin/adicionar-peca" element={<FormularioCatalogoAdmin demonstracao />} />
    </Route>

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

    {/* Endereços anteriores preservados como prévias sem persistência. */}
    <Route path="/editar-peca" element={<AdminEditarPeca demonstracao />} />

    {/* Tela de adição de peça (Admin) */}
    <Route path="/adicionar-peca" element={<AdminAdicionarPeca demonstracao />} />
  </>
)

import { Route } from 'react-router-dom'
import InicioAdmin from '../../paginas/Admin/InicioAdmin'
import DestaquesAdmin from '../../paginas/Admin/Destaques/DestaquesAdmin'
import CatalogoAdmin from '../../paginas/Admin/CatalogoAdmin/CatalogoAdmin'
import CatalogoPersistenteProvider from '../../paginas/Admin/CatalogoAdmin/CatalogoPersistenteProvider'
import FormularioCatalogoAdmin from '../../paginas/Admin/CatalogoAdmin/FormularioCatalogoAdmin'
import PedidosAdmin from '../../paginas/Admin/Pedidos/PedidosAdmin'
import ExigirAdministrador from './ExigirAdministrador'
import MeuPerfil from '../../paginas/MeuPerfil/MeuPerfil'
import MeusPedidos from '../../paginas/MeusPedidos/MeusPedidos'

export const rotasPrivadas = (
  <>
    <Route path="/meu-perfil" element={<MeuPerfil />} />
    <Route path="/meus-pedidos" element={<MeusPedidos />} />
    <Route element={<ExigirAdministrador><CatalogoPersistenteProvider /></ExigirAdministrador>}>
      <Route path="/admin/*" element={<InicioAdmin />} />
      <Route path="/admin/catalogo" element={<CatalogoAdmin />} />
      <Route path="/admin/adicionar-peca" element={<FormularioCatalogoAdmin />} />
      <Route path="/admin/editar-peca" element={<FormularioCatalogoAdmin editar />} />
    </Route>
    <Route path="/admin/pedidos" element={<ExigirAdministrador><PedidosAdmin /></ExigirAdministrador>} />
    <Route path="/admin/destaques" element={<ExigirAdministrador><DestaquesAdmin /></ExigirAdministrador>} />
  </>
)

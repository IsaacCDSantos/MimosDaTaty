import { Route } from 'react-router-dom'
import InicioAdmin from '../../paginas/Admin/InicioAdmin'
import CatalogoAdmin from '../../paginas/Admin/CatalogoAdmin/CatalogoAdmin'
import CatalogoPersistenteProvider from '../../paginas/Admin/CatalogoAdmin/CatalogoPersistenteProvider'
import FormularioCatalogoAdmin from '../../paginas/Admin/CatalogoAdmin/FormularioCatalogoAdmin'
import PedidosAdmin from '../../paginas/Admin/Pedidos/PedidosAdmin'
import ExigirAdministrador from './ExigirAdministrador'
import MeuPerfil from '../../paginas/MeuPerfil/MeuPerfil'

export const rotasPrivadas = (
  <>
    <Route path="/meu-perfil" element={<MeuPerfil />} />
    <Route element={<ExigirAdministrador><CatalogoPersistenteProvider /></ExigirAdministrador>}>
      <Route path="/admin/catalogo" element={<CatalogoAdmin />} />
      <Route path="/admin/adicionar-peca" element={<FormularioCatalogoAdmin />} />
      <Route path="/admin/editar-peca" element={<FormularioCatalogoAdmin editar />} />
    </Route>
    <Route path="/admin/pedidos" element={<ExigirAdministrador><PedidosAdmin /></ExigirAdministrador>} />
    <Route path="/admin/*" element={<ExigirAdministrador><InicioAdmin /></ExigirAdministrador>} />
  </>
)

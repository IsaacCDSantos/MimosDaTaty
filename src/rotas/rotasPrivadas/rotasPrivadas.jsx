import { Route } from 'react-router-dom'
import InicioAdmin from '../../paginas/Admin/InicioAdmin'
import PedidosAdmin from '../../paginas/Admin/Pedidos/PedidosAdmin'
import ExigirAdministrador from './ExigirAdministrador'
import AdminEditarPeca from '../../paginas/Admin/EditarPeca/AdminEditarPeca'
import AdminAdicionarPeca from '../../paginas/Admin/AdicionarPeca/AdminAdicionarPeca'

export const rotasPrivadas = (
  <>
    <Route path="/admin/editar-peca" element={<ExigirAdministrador><AdminEditarPeca /></ExigirAdministrador>} />
    <Route path="/admin/adicionar-peca" element={<ExigirAdministrador><AdminAdicionarPeca /></ExigirAdministrador>} />
    <Route path="/admin/pedidos" element={<ExigirAdministrador><PedidosAdmin /></ExigirAdministrador>} />
    <Route path="/admin/*" element={<ExigirAdministrador><InicioAdmin /></ExigirAdministrador>} />
  </>
)

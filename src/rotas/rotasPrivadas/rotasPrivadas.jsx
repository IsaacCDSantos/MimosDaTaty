import { Route } from 'react-router-dom'
import InicioAdmin from '../../paginas/Admin/InicioAdmin'
import PedidosAdmin from '../../paginas/Admin/Pedidos/PedidosAdmin'
import ExigirAdministrador from './ExigirAdministrador'

export const rotasPrivadas = (
  <>
    <Route path="/admin/pedidos" element={<ExigirAdministrador><PedidosAdmin /></ExigirAdministrador>} />
    <Route path="/admin/*" element={<ExigirAdministrador><InicioAdmin /></ExigirAdministrador>} />
  </>
)

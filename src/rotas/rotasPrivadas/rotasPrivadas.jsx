import { Route } from 'react-router-dom'
import InicioAdmin from '../../paginas/Admin/InicioAdmin'
import ExigirAdministrador from './ExigirAdministrador'

export const rotasPrivadas = (
  <>
    <Route path="/admin/*" element={<ExigirAdministrador><InicioAdmin /></ExigirAdministrador>} />
  </>
)

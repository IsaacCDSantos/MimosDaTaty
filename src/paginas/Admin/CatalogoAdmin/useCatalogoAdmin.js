import { useContext } from 'react'
import { CatalogoAdminContext } from './catalogoContext'

export function useCatalogoAdmin() {
  return useContext(CatalogoAdminContext)
}

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { aplicarSeo, seoDaRota } from '../../servicos/seo'

// Atualiza título, descrição e indexação a cada troca de página.
export default function SeoDaRota() {
  const { pathname } = useLocation()
  useEffect(() => {
    const seo = seoDaRota(pathname)
    if (seo) aplicarSeo({ ...seo, caminho: pathname })
  }, [pathname])
  return null
}

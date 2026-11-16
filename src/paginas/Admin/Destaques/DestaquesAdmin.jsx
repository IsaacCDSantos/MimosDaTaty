import { useLocation, useNavigate } from 'react-router-dom'
import PainelDestaques from './PainelDestaques'
import { useDestaquesCatalogo } from './useDestaquesCatalogo'
import './DestaquesAdmin.css'

export default function DestaquesAdmin() {
  const navigate = useNavigate()
  const location = useLocation()
  const inicio = '/admin'
  const destaques = useDestaquesCatalogo()

  function voltar() {
    if (location.state?.origemDestaques === inicio && location.key !== 'default') navigate(-1)
    else navigate(inicio, { replace: true })
  }

  return <div className="destaques-admin-page">
    <main className="destaques-admin-main" aria-labelledby="destaques-admin-titulo">
      <div className="destaques-admin-topo">
        <button className="destaques-admin-voltar" type="button" onClick={voltar} aria-label="Voltar à tela anterior" title="Voltar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
        </button>
        <div><h1 id="destaques-admin-titulo">Destaques do catálogo</h1><p>Produtos mais vistos na vitrine, por aberturas dos detalhes das peças.</p></div>
      </div>
      <PainelDestaques {...destaques} />
    </main>
  </div>
}

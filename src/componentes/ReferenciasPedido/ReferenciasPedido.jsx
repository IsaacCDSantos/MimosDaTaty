import { useEffect, useState } from 'react'
import { servicoReferenciasPedido } from '../../servicos/referenciasPedido'
import './ReferenciasPedido.css'

export default function ReferenciasPedido({ referencias, servico = servicoReferenciasPedido }) {
  const [estado, setEstado] = useState({ situacao: 'carregando', fotos: [] })
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    let ativo = true
    if (!referencias?.length) return
    servico.assinarReferencias(referencias).then(fotos => {
      if (ativo) setEstado({ situacao: 'pronto', fotos })
    }).catch(() => {
      if (ativo) setEstado({ situacao: 'erro', fotos: [] })
    })
    return () => { ativo = false }
  }, [referencias, servico, tentativa])
  if (!referencias?.length) return null
  function tentarNovamente() {
    setEstado({ situacao: 'carregando', fotos: [] })
    setTentativa(valor => valor + 1)
  }
  return <GaleriaReferenciasPedido estado={estado} aoTentarNovamente={tentarNovamente} aoFalhar={() => setEstado({ situacao: 'erro', fotos: [] })} />
}

export function GaleriaReferenciasPedido({ estado, aoTentarNovamente, aoFalhar }) {
  return <div className="referencias-pedido" aria-label="Fotos de referência da peça" aria-busy={estado.situacao === 'carregando'}>
    <p className="referencias-pedido-titulo">Fotos de referência</p>
    {estado.situacao === 'carregando' && <p role="status">Carregando fotos de referência…</p>}
    {estado.situacao === 'erro' && <div><p role="alert">Não foi possível exibir as fotos. O acesso pode ter expirado.</p><button type="button" onClick={aoTentarNovamente}>Tentar carregar fotos novamente</button></div>}
    {estado.situacao === 'pronto' && <ul>{estado.fotos.map((foto, indice) => <li key={foto.caminho + indice}>
      <a href={foto.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir referência ${foto.nome} em nova aba`}>
        <img src={foto.url} alt={foto.nome} referrerPolicy="no-referrer" onError={aoFalhar} />
        <span>{foto.nome}</span><small>Abrir em nova aba ↗</small>
      </a>
    </li>)}</ul>}
  </div>
}

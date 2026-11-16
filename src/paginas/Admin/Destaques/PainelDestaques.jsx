import ListaDestaques from './ListaDestaques'

export default function PainelDestaques({ destaques, carregando, erro, recarregar, compacto = false, aoSelecionar }) {
  return <div className="destaques-catalogo-resultados" aria-busy={carregando}>
    {carregando ? <p className="destaques-catalogo-mensagem" role="status">Carregando produtos mais vistos…</p>
      : erro ? <div className="destaques-catalogo-mensagem" role="alert"><p>{erro}</p><button className="destaques-catalogo-recarregar" type="button" onClick={recarregar}>Tentar novamente</button></div>
        : destaques.length ? <ListaDestaques destaques={destaques} compacto={compacto} aoSelecionar={aoSelecionar} />
          : <p className="destaques-catalogo-mensagem" role="status">Nenhuma peça recebeu visualizações ainda. Os produtos aparecerão aqui conforme seus detalhes forem abertos na vitrine.</p>}
  </div>
}

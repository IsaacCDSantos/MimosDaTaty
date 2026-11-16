export function calcularIndicadoresCatalogo(pecas) {
  if (!Array.isArray(pecas)) throw new Error('A lista de peças é inválida.')

  const resumo = { total: 0, visiveis: 0, ocultas: 0 }
  for (const peca of pecas) {
    if (peca.arquivada === true) continue
    resumo.total += 1
    if (peca.visivel === true) resumo.visiveis += 1
    else resumo.ocultas += 1
  }
  return resumo
}

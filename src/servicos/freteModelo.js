export function cepValido(cep) { return typeof cep === 'string' && /^\d{5}-?\d{3}$/.test(cep.trim()) }
export function estadoDaCotacao(estado, chave, agora = Date.now()) {
 if (!estado || estado.chave !== chave) return { situacao: 'inicial' }
 if (estado.situacao === 'pronto' && (!Number.isFinite(Date.parse(estado.cotacao.expiraEm)) || Date.parse(estado.cotacao.expiraEm) <= agora)) return { situacao: 'expirado' }
 return estado
}
export function validarCotacao(dados, agora = Date.now()) {
 if (!dados || !Array.isArray(dados.opcoes) || !dados.opcoes.length || !Number.isSafeInteger(dados.subtotalCentavos) || dados.subtotalCentavos <= 0 || !Number.isInteger(dados.prazoProducaoDias) || dados.prazoProducaoDias < 0 || !['production', 'sandbox'].includes(dados.ambiente) || !Number.isFinite(Date.parse(dados.expiraEm))) throw new Error('A resposta do cálculo de frete é inválida. Tente novamente.')
 const validade = Date.parse(dados.expiraEm)
 if (validade <= agora || validade > agora + 660000) throw new Error('A validade da cotação é inválida ou expirou. Calcule novamente.')
 const ids = new Set()
 for (const o of dados.opcoes) {
  if (!o || typeof o.id !== 'string' || ids.has(o.id) || !o.id || typeof o.nome !== 'string' || typeof o.transportadora !== 'string' || !Number.isSafeInteger(o.precoCentavos) || o.precoCentavos < 0 || !Number.isInteger(o.prazoMinDias) || !Number.isInteger(o.prazoMaxDias) || o.prazoMinDias < 0 || o.prazoMaxDias < o.prazoMinDias) throw new Error('A resposta do cálculo de frete é inválida. Tente novamente.')
  ids.add(o.id)
 }
 return dados
}
export function criarServicoFrete(cliente) {
 return async ({ cepDestino, itens }) => {
  if (!cepValido(cepDestino)) throw new Error('Informe um CEP com oito números.')
  if (!itens.length) throw new Error('Adicione uma peça ao carrinho antes de calcular o frete.')
  if (!cliente) throw new Error('O cálculo de frete está indisponível no momento.')
  let temporizador
  try {
   const resposta = await Promise.race([cliente.functions.invoke('calcular-frete', { body: { cepDestino: cepDestino.trim().replace('-', ''), itens: itens.map(i => ({ pecaId: i.id, quantidade: i.quantidade })) } }), new Promise((_, rejeitar) => { temporizador = setTimeout(() => rejeitar(new Error('O cálculo demorou mais que o esperado. Tente novamente.')), 20000) })])
   if (resposta.error) {
    let detalhe
    try { detalhe = await resposta.error.context?.json() } catch { /* Não exibir erros internos do provedor. */ }
    const erro = new Error(typeof detalhe?.mensagem === 'string' ? detalhe.mensagem.slice(0, 300) : 'Não foi possível calcular o frete. Tente novamente.')
    erro.codigo = detalhe?.codigo
    throw erro
   }
   return validarCotacao(resposta.data)
  } finally { clearTimeout(temporizador) }
 }
}

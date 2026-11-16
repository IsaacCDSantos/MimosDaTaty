export function etapaDoCheckout(pagamento, recuperando, aguardandoEscolha) {
  if (recuperando) return 'verificando'
  if (!pagamento) return 'formulario'
  if (aguardandoEscolha && ['preparado', 'pendente', 'processando'].includes(pagamento.estado)) return 'retomada'
  return 'pagamento'
}

export function criarServicoCheckout(cliente) {
  return async (acao, dados = {}) => {
    if (!cliente) throw new Error('O pagamento está indisponível no momento.')
    let tempo
    try {
      const resultado = await Promise.race([
        cliente.functions.invoke('checkout', { body: { ...dados, acao } }),
        new Promise((_, rejeitar) => { tempo = setTimeout(() => rejeitar(new Error('A operação está demorando. Consulte o pagamento antes de tentar novamente.')), 35000) }),
      ])
      if (resultado.error) {
        let detalhe
        try { detalhe = await resultado.error.context?.json() } catch { /* Não exibir dados internos do provedor. */ }
        const erro = new Error(typeof detalhe?.mensagem === 'string' ? detalhe.mensagem.slice(0, 300) : 'Não foi possível consultar o pagamento. Tente novamente em instantes.')
        erro.codigo = detalhe?.codigo
        throw erro
      }
      return resultado.data
    } finally { clearTimeout(tempo) }
  }
}
let carregamento
export function carregarMercadoPago() {
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago)
  if (carregamento) return carregamento
  carregamento = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    const tempo = setTimeout(() => { script.remove(); carregamento = null; reject(new Error('Não foi possível carregar os campos do cartão.')) }, 15000)
    script.onload = () => { clearTimeout(tempo); if (window.MercadoPago) resolve(window.MercadoPago); else { carregamento = null; reject(new Error('Os campos do cartão estão indisponíveis.')) } }
    script.onerror = () => { clearTimeout(tempo); script.remove(); carregamento = null; reject(new Error('Confira sua conexão para carregar os campos do cartão.')) }
    document.head.appendChild(script)
  })
  return carregamento
}

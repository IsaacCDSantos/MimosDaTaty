export function etapaDoCheckout(pagamento, recuperando, aguardandoEscolha) {
  if (recuperando) return 'verificando'
  if (!pagamento) return 'formulario'
  if (aguardandoEscolha && ['preparado', 'pendente', 'processando'].includes(pagamento.estado)) return 'retomada'
  return 'pagamento'
}

// A aba guarda a tentativa e as peças enviadas, sem dados pessoais. O formato
// antigo (só o ID) continua aceito para não perder tentativas já abertas.
export function serializarTentativa(sessaoId, itens) {
  return JSON.stringify({ sessaoId, itens: Array.isArray(itens) ? itens.map(({ pecaId, quantidade }) => ({ pecaId, quantidade })) : null })
}

export function lerTentativa(valor) {
  if (typeof valor !== 'string' || !valor) return null
  try {
    const dados = JSON.parse(valor)
    if (dados && typeof dados.sessaoId === 'string' && dados.sessaoId) {
      return { sessaoId: dados.sessaoId, itens: Array.isArray(dados.itens) ? dados.itens : null }
    }
  } catch { /* Formato antigo: o valor é o próprio ID. */ }
  return { sessaoId: valor, itens: null }
}

// Uma tentativa aberta em outro aparelho só é retomada enquanto ainda puder ser paga.
export function tentativaRetomavel(dados, agora = Date.now()) {
  if (!dados || !['preparado', 'pendente', 'processando'].includes(dados.estado)) return false
  if (dados.estado === 'processando') return true
  const expira = Date.parse(dados.expiraEm)
  return !Number.isFinite(expira) || expira > agora
}

// O pedido e a tentativa de checkout compartilham o mesmo ID; um pedido novo com
// pagamento pendente das últimas 24 h é o candidato a retomar em outro aparelho.
export function criarBuscaTentativaAberta(cliente) {
  return async (clienteId, agora = Date.now()) => {
    if (!cliente || !clienteId) return null
    const desde = new Date(agora - 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await cliente.from('pedidos').select('id')
      .eq('cliente_id', clienteId).eq('status_pedido', 'novo').eq('status_pagamento', 'pendente')
      .gte('criado_em', desde).order('criado_em', { ascending: false }).limit(1)
    if (error) throw error
    return data?.[0]?.id ?? null
  }
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

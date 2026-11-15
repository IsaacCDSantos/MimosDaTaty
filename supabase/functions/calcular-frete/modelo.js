export class ErroFrete extends Error {
  constructor(status, codigo, mensagem) {
    super(mensagem)
    this.name = 'ErroFrete'
    this.status = status
    this.codigo = codigo
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAXIMO_ITENS = 30
const MAXIMO_QUANTIDADE = 50
const MAXIMO_INTEIRO_POSTGRES = 2147483647

function cepNormalizado(valor) {
  if (typeof valor !== 'string' || !/^\d{5}-?\d{3}$/.test(valor.trim())) return null
  return valor.trim().replace('-', '')
}

function idNormalizado(valor) {
  return typeof valor === 'string' && UUID.test(valor.trim()) ? valor.trim().toLowerCase() : null
}

export function validarPedido(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ErroFrete(400, 'PEDIDO_INVALIDO', 'Informe o CEP de destino e os itens do carrinho.')
  }
  const cepDestino = cepNormalizado(body.cepDestino)
  if (!cepDestino) {
    throw new ErroFrete(400, 'CEP_INVALIDO', 'Informe um CEP com oito números, com ou sem hífen.')
  }
  if (!Array.isArray(body.itens) || body.itens.length < 1 || body.itens.length > MAXIMO_ITENS) {
    throw new ErroFrete(400, 'ITENS_INVALIDOS', 'O carrinho deve conter de 1 a 30 itens.')
  }
  const agrupados = new Map()
  for (const item of body.itens) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new ErroFrete(400, 'ITEM_INVALIDO', 'Um dos itens do carrinho é inválido.')
    }
    const pecaId = idNormalizado(item.pecaId)
    if (!pecaId) {
      throw new ErroFrete(400, 'PECA_INVALIDA', 'Informe um identificador válido para cada peça.')
    }
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > MAXIMO_QUANTIDADE) {
      throw new ErroFrete(400, 'QUANTIDADE_INVALIDA', 'A quantidade de cada peça deve ser um inteiro entre 1 e 50.')
    }
    const quantidade = (agrupados.get(pecaId) || 0) + item.quantidade
    if (quantidade > MAXIMO_QUANTIDADE) {
      throw new ErroFrete(400, 'QUANTIDADE_INVALIDA', 'A quantidade total de uma mesma peça não pode ultrapassar 50.')
    }
    agrupados.set(pecaId, quantidade)
  }
  return { cepDestino, itens: Array.from(agrupados, ([pecaId, quantidade]) => ({ pecaId, quantidade })) }
}

function configurarPayload(pedido, config) {
  const cepOrigem = cepNormalizado(config?.cepOrigem)
  if (!cepOrigem) {
    throw new ErroFrete(500, 'CONFIGURACAO_INVALIDA', 'O CEP de origem do frete não foi configurado corretamente.')
  }
  const embalagem = {}
  for (const campo of ['height', 'width', 'length', 'weight']) {
    const valor = config?.embalagem?.[campo]
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
      throw new ErroFrete(500, 'CONFIGURACAO_INVALIDA', 'As medidas e o peso da embalagem precisam ser positivos.')
    }
    embalagem[campo] = valor
  }
  if (typeof config?.services !== 'string') {
    throw new ErroFrete(500, 'CONFIGURACAO_INVALIDA', 'Os serviços de entrega não foram configurados corretamente.')
  }
  const servicos = config.services.split(',').map(item => item.trim())
  if (!servicos.length || servicos.some(item => !/^[1-9]\d*$/.test(item))) {
    throw new ErroFrete(500, 'CONFIGURACAO_INVALIDA', 'Os serviços de entrega não foram configurados corretamente.')
  }
  return {
    from: { postal_code: cepOrigem },
    to: { postal_code: pedido.cepDestino },
    services: [...new Set(servicos)].join(','),
    options: { own_hand: false, receipt: false, insurance_value: 0, use_insurance_value: false },
    package: embalagem,
  }
}

export function prepararCotacao(pedido, pecas, config) {
  const validado = validarPedido(pedido)
  const payload = configurarPayload(validado, config)
  if (!Array.isArray(pecas)) {
    throw new ErroFrete(500, 'CATALOGO_INVALIDO', 'Não foi possível conferir os dados das peças.')
  }
  const porId = new Map()
  for (const peca of pecas) {
    const id = idNormalizado(peca?.id)
    if (!id || porId.has(id)) {
      throw new ErroFrete(500, 'CATALOGO_INVALIDO', 'O catálogo retornou dados inconsistentes. Tente novamente.')
    }
    porId.set(id, peca)
  }
  let subtotalCentavos = 0
  let prazoProducaoDias = 0
  for (const item of validado.itens) {
    const peca = porId.get(item.pecaId)
    if (!peca || peca.visivel !== true || peca.arquivada !== false) {
      throw new ErroFrete(409, 'PECA_INDISPONIVEL', 'Uma peça do carrinho não está disponível. Atualize o carrinho.')
    }
    if (!Number.isInteger(peca.preco_centavos) || peca.preco_centavos <= 0 || peca.preco_centavos > MAXIMO_INTEIRO_POSTGRES
      || !Number.isInteger(peca.prazo_producao_dias) || peca.prazo_producao_dias <= 0 || peca.prazo_producao_dias > MAXIMO_INTEIRO_POSTGRES) {
      throw new ErroFrete(500, 'CATALOGO_INVALIDO', 'Uma peça está com preço ou prazo de produção inválido.')
    }
    if (!['pronta_entrega', 'sob_encomenda'].includes(peca.tipo_disponibilidade)) {
      throw new ErroFrete(500, 'CATALOGO_INVALIDO', 'Não foi possível conferir a disponibilidade de uma peça.')
    }
    const estoque = peca.estoque_atual
    if ((estoque !== null && estoque !== undefined && (!Number.isInteger(estoque) || estoque < 0 || estoque > MAXIMO_INTEIRO_POSTGRES))
      || (peca.tipo_disponibilidade === 'pronta_entrega' && !Number.isInteger(estoque))) {
      throw new ErroFrete(500, 'CATALOGO_INVALIDO', 'Não foi possível conferir o estoque de uma peça.')
    }
    if (peca.tipo_disponibilidade === 'pronta_entrega' && item.quantidade > estoque) {
      throw new ErroFrete(409, 'ESTOQUE_INSUFICIENTE', 'Uma peça não possui estoque suficiente para a quantidade solicitada.')
    }
    subtotalCentavos += peca.preco_centavos * item.quantidade
    if (!Number.isSafeInteger(subtotalCentavos)) {
      throw new ErroFrete(400, 'VALOR_INVALIDO', 'O valor do carrinho ultrapassa o limite permitido.')
    }
    prazoProducaoDias = Math.max(prazoProducaoDias, peca.prazo_producao_dias)
  }
  return { payload, subtotalCentavos, prazoProducaoDias }
}

function centavosValidos(valor) {
  let numero = valor
  if (typeof valor === 'string') {
    const texto = valor.trim()
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(texto)) return null
    numero = Number(texto.replace(',', '.'))
  }
  if (typeof numero !== 'number' || !Number.isFinite(numero) || numero < 0) return null
  const centavos = Math.round(numero * 100)
  if (!Number.isSafeInteger(centavos) || Math.abs(numero - centavos / 100) > 1e-8) return null
  return centavos === 0 ? 0 : centavos
}

function prazoValido(valor) {
  let numero = valor
  if (typeof valor === 'string') {
    if (!/^\d+$/.test(valor.trim())) return null
    numero = Number(valor.trim())
  }
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : null
}

function intervaloValido(opcao) {
  if (opcao.delivery_range !== undefined && opcao.delivery_range !== null) {
    const minimo = prazoValido(opcao.delivery_range?.min)
    const maximo = prazoValido(opcao.delivery_range?.max)
    if (minimo === null || maximo === null || minimo > maximo) return null
    return { minimo, maximo }
  }
  const prazo = prazoValido(opcao.delivery_time)
  return prazo === null ? null : { minimo: prazo, maximo: prazo }
}

export function normalizarOpcoes(rawArray) {
  if (!Array.isArray(rawArray)) {
    throw new ErroFrete(502, 'RESPOSTA_INVALIDA', 'O serviço de frete retornou uma resposta inválida. Tente novamente.')
  }
  const opcoes = []
  const ids = new Set()
  for (const opcao of rawArray) {
    if (!opcao || typeof opcao !== 'object' || Array.isArray(opcao) || opcao.has_error || opcao.error) continue
    const id = (typeof opcao.id === 'string' && opcao.id.trim())
      || (typeof opcao.id === 'number' && Number.isSafeInteger(opcao.id) && opcao.id > 0 ? String(opcao.id) : null)
    if (!id || ids.has(id)) continue
    const precoCentavos = centavosValidos(opcao.price)
    const prazo = intervaloValido(opcao)
    if (precoCentavos === null || !prazo) continue
    const nome = typeof opcao.name === 'string' && opcao.name.trim() ? opcao.name.trim() : 'Serviço ' + id
    const transportadora = typeof opcao.company?.name === 'string' ? opcao.company.name.trim() : ''
    opcoes.push({ id, nome, transportadora, precoCentavos, prazoMinDias: prazo.minimo, prazoMaxDias: prazo.maximo })
    ids.add(id)
  }
  return opcoes
}

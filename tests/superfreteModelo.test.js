import test from 'node:test'
import assert from 'node:assert/strict'
import { ErroFrete, validarPedido, prepararCotacao, normalizarOpcoes } from '../supabase/functions/calcular-frete/modelo.js'

const ID_A = '10000000-0000-4000-8000-000000000001'
const ID_B = '10000000-0000-4000-8000-000000000002'
const config = {
  cepOrigem: '61940-000',
  embalagem: { height: 10, width: 20, length: 30, weight: 1 },
  services: '1,2,17',
}
const pecaA = {
  id: ID_A, nome: 'Kit de berço', preco_centavos: 18900, visivel: true, arquivada: false,
  tipo_disponibilidade: 'pronta_entrega', estoque_atual: 5, prazo_producao_dias: 7,
}
const pecaB = {
  id: ID_B, nome: 'Manta', preco_centavos: 12900, visivel: true, arquivada: false,
  tipo_disponibilidade: 'sob_encomenda', estoque_atual: null, prazo_producao_dias: 10,
}
const pedido = { cepDestino: '01001-000', itens: [{ pecaId: ID_A, quantidade: 2 }, { pecaId: ID_B, quantidade: 1 }] }
const opcaoValida = { id: 1, name: 'PAC', company: { name: 'Correios' }, price: 18.61, delivery_time: 5, delivery_range: { min: 4, max: 5 }, has_error: false }

function congelar(valor) {
  if (valor && typeof valor === 'object') {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}

function falha(status, codigo) {
  return erro => erro instanceof ErroFrete && erro.status === status && erro.codigo === codigo && typeof erro.message === 'string'
}

test('ErroFrete expõe status, código e mensagem utilizáveis pelo handler', () => {
  const erro = new ErroFrete(400, 'CEP_INVALIDO', 'Confira o CEP.')
  assert.equal(erro.name, 'ErroFrete')
  assert.equal(erro.message, 'Confira o CEP.')
  assert.equal(erro.status, 400)
  assert.equal(erro.codigo, 'CEP_INVALIDO')
})

test('pedido normaliza CEP/UUID, agrega duplicados e ignora preços ou campos fornecidos pelo cliente', () => {
  const entrada = congelar({
    cepDestino: '01001-000', preco: 0.01, freteCentavos: 0,
    itens: [
      { pecaId: ID_A.toUpperCase(), quantidade: 2, preco_centavos: 1 },
      { pecaId: ID_B, quantidade: 1 },
      { pecaId: ID_A, quantidade: 3 },
    ],
  })
  assert.deepEqual(validarPedido(entrada), {
    cepDestino: '01001000',
    itens: [{ pecaId: ID_A, quantidade: 5 }, { pecaId: ID_B, quantidade: 1 }],
  })
  assert.equal(entrada.itens.length, 3)
  assert.equal(validarPedido({ cepDestino: '61940000', itens: [{ pecaId: ID_A, quantidade: 50 }] }).itens[0].quantidade, 50)
})

test('CEP rejeita letras, números JSON, formatos incompletos e hífen em posição incorreta', () => {
  for (const cepDestino of [null, undefined, 1001000, '', '0100A000', '0100100', '010010000', '0100-1000', '01001 000', '01001--000']) {
    assert.throws(() => validarPedido({ ...pedido, cepDestino }), falha(400, 'CEP_INVALIDO'), String(cepDestino))
  }
  assert.throws(() => validarPedido(null), falha(400, 'PEDIDO_INVALIDO'))
  assert.throws(() => validarPedido([]), falha(400, 'PEDIDO_INVALIDO'))
})

test('carrinho limita itens e quantidades antes e depois de agrupar', () => {
  for (const quantidade of [0, -1, 1.5, 51, '2', true, NaN, Infinity, null]) {
    assert.throws(() => validarPedido({ ...pedido, itens: [{ pecaId: ID_A, quantidade }] }), falha(400, 'QUANTIDADE_INVALIDA'))
  }
  for (const itens of [null, [], {}, Array.from({ length: 31 }, () => ({ pecaId: ID_A, quantidade: 1 }))]) {
    assert.throws(() => validarPedido({ ...pedido, itens }), falha(400, 'ITENS_INVALIDOS'))
  }
  assert.throws(() => validarPedido({ ...pedido, itens: [{ pecaId: ID_A, quantidade: 25 }, { pecaId: ID_A, quantidade: 26 }] }), falha(400, 'QUANTIDADE_INVALIDA'))
  assert.throws(() => validarPedido({ ...pedido, itens: [{ pecaId: 'abc', quantidade: 1 }] }), falha(400, 'PECA_INVALIDA'))
  assert.throws(() => validarPedido({ ...pedido, itens: [null] }), falha(400, 'ITEM_INVALIDO'))
  assert.equal(validarPedido({ ...pedido, itens: Array.from({ length: 30 }, () => ({ pecaId: ID_A, quantidade: 1 })) }).itens[0].quantidade, 30)
})

test('cotação usa valores do banco, prazo máximo e o pacote fixo autorizado', () => {
  const entrada = congelar({ ...pedido, itens: [{ pecaId: ID_A, quantidade: 2, preco_centavos: 1 }, { pecaId: ID_B, quantidade: 1, preco: 0 }] })
  const resultado = prepararCotacao(entrada, congelar([{ ...pecaA }, { ...pecaB }]), congelar(structuredClone(config)))
  assert.equal(resultado.subtotalCentavos, 50700)
  assert.equal(resultado.prazoProducaoDias, 10)
  assert.deepEqual(resultado.payload, {
    from: { postal_code: '61940000' }, to: { postal_code: '01001000' }, services: '1,2,17',
    options: { own_hand: false, receipt: false, insurance_value: 0, use_insurance_value: false },
    package: { height: 10, width: 20, length: 30, weight: 1 },
  })
  assert.notStrictEqual(resultado.payload.package, config.embalagem)
  assert.equal(Object.hasOwn(resultado.payload, 'products'), false)
})

test('peças ausentes, ocultas e arquivadas impedem cotação parcial do carrinho', () => {
  for (const pecas of [[pecaB], [{ ...pecaA, visivel: false }, pecaB], [{ ...pecaA, arquivada: true }, pecaB]]) {
    assert.throws(() => prepararCotacao(pedido, pecas, config), falha(409, 'PECA_INDISPONIVEL'))
  }
})

test('estoque de pronta entrega considera quantidade agrupada e sob encomenda não exige estoque disponível', () => {
  const duplicado = { ...pedido, itens: [{ pecaId: ID_A, quantidade: 3 }, { pecaId: ID_A, quantidade: 3 }] }
  assert.throws(() => prepararCotacao(duplicado, [pecaA], config), falha(409, 'ESTOQUE_INSUFICIENTE'))
  assert.throws(() => prepararCotacao({ ...pedido, itens: [{ pecaId: ID_A, quantidade: 1 }] }, [{ ...pecaA, estoque_atual: 0 }], config), falha(409, 'ESTOQUE_INSUFICIENTE'))
  const encomenda = prepararCotacao({ ...pedido, itens: [{ pecaId: ID_B, quantidade: 50 }] }, [{ ...pecaB, estoque_atual: 0 }], config)
  assert.equal(encomenda.subtotalCentavos, 645000)
  assert.equal(encomenda.payload.package.weight, 1)
})

test('inconsistências de preço, prazo, tipo e estoque no banco não viram cotação válida', () => {
  for (const campos of [
    { preco_centavos: 0 }, { preco_centavos: '18900' }, { preco_centavos: 1.5 }, { preco_centavos: Infinity },
    { prazo_producao_dias: 0 }, { prazo_producao_dias: null }, { prazo_producao_dias: 2.5 },
    { tipo_disponibilidade: 'desconhecido' }, { estoque_atual: null }, { estoque_atual: -1 },
  ]) {
    assert.throws(() => prepararCotacao({ ...pedido, itens: [{ pecaId: ID_A, quantidade: 1 }] }, [{ ...pecaA, ...campos }], config), falha(500, 'CATALOGO_INVALIDO'))
  }
  assert.throws(() => prepararCotacao(pedido, null, config), falha(500, 'CATALOGO_INVALIDO'))
  assert.throws(() => prepararCotacao(pedido, [pecaA, pecaA, pecaB], config), falha(500, 'CATALOGO_INVALIDO'))
})

test('configuração inválida não produz request com CEP ou embalagem inventados', () => {
  for (const invalida of [
    null, { ...config, cepOrigem: 'origem' }, { ...config, services: '' },
    { ...config, services: '1,,2' }, { ...config, services: 'PAC' },
    { ...config, embalagem: { ...config.embalagem, weight: 0 } },
    { ...config, embalagem: { ...config.embalagem, height: '10' } },
  ]) {
    assert.throws(() => prepararCotacao(pedido, [pecaA, pecaB], invalida), falha(500, 'CONFIGURACAO_INVALIDA'))
  }
})

test('opções oficiais convertem preço para centavos e preservam intervalo de entrega', () => {
  assert.deepEqual(normalizarOpcoes([opcaoValida]), [{
    id: '1', nome: 'PAC', transportadora: 'Correios', precoCentavos: 1861, prazoMinDias: 4, prazoMaxDias: 5,
  }])
  const texto = normalizarOpcoes([{ ...opcaoValida, id: '2', name: 'SEDEX', price: '10.77', delivery_range: undefined, delivery_time: '1' }])
  assert.deepEqual(texto[0], { id: '2', nome: 'SEDEX', transportadora: 'Correios', precoCentavos: 1077, prazoMinDias: 1, prazoMaxDias: 1 })
})

test('preço zero explícito permanece válido; ausente ou nulo não vira frete grátis', () => {
  assert.equal(normalizarOpcoes([{ ...opcaoValida, price: 0 }])[0].precoCentavos, 0)
  assert.equal(normalizarOpcoes([{ ...opcaoValida, price: '0.00' }])[0].precoCentavos, 0)
  assert.equal(normalizarOpcoes([{ ...opcaoValida, price: '18,61' }])[0].precoCentavos, 1861)
  for (const price of [null, undefined, '', ' ', true, false, -1, '-1.00', 'gratuito', '1e2', 1.001, NaN, Infinity]) {
    assert.deepEqual(normalizarOpcoes([{ ...opcaoValida, price }]), [], String(price))
  }
})

test('prazo ausente, nulo, fracionário ou invertido descarta opção em vez de prometer entrega imediata', () => {
  for (const delivery_time of [null, undefined, '', ' ', true, false, -1, 1.5, '5 dias', Infinity]) {
    assert.deepEqual(normalizarOpcoes([{ ...opcaoValida, delivery_range: undefined, delivery_time }]), [])
  }
  for (const delivery_range of [{}, { min: null, max: 5 }, { min: 5, max: null }, { min: 6, max: 5 }, { min: 1.5, max: 5 }]) {
    assert.deepEqual(normalizarOpcoes([{ ...opcaoValida, delivery_range }]), [])
  }
  assert.equal(normalizarOpcoes([{ ...opcaoValida, delivery_range: undefined, delivery_time: 0 }])[0].prazoMaxDias, 0)
})

test('opções com erro são descartadas e lista inteiramente indisponível resulta em array vazio', () => {
  assert.deepEqual(normalizarOpcoes([
    { ...opcaoValida, has_error: true }, { ...opcaoValida, error: 'Serviço indisponível' }, null, [], false,
  ]), [])
  assert.deepEqual(normalizarOpcoes([]), [])
})

test('objeto ou envelope inesperado do provedor gera erro 502, sem simular ausência de frete', () => {
  for (const resposta of [null, undefined, {}, { data: [opcaoValida] }, '[]']) {
    assert.throws(() => normalizarOpcoes(resposta), falha(502, 'RESPOSTA_INVALIDA'))
  }
})

test('normalização não modifica resposta original e não duplica IDs de serviço', () => {
  const fonte = congelar([structuredClone(opcaoValida), { ...structuredClone(opcaoValida), price: '20.00' }])
  assert.equal(normalizarOpcoes(fonte).length, 1)
  assert.equal(fonte[0].price, 18.61)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { adicionarItem, descontarItensPagos } from '../src/carrinho/modelo.js'
import { criarBuscaTentativaAberta, lerTentativa, serializarTentativa, tentativaRetomavel } from '../src/servicos/checkoutModelo.js'

const manta = { id: 'manta', nome: 'Manta', preco: 50, quantidade: 2, tipoDisponibilidade: 'sob_encomenda', estoque: 0 }
const toalha = { id: 'toalha', nome: 'Toalha', preco: 80, quantidade: 1, tipoDisponibilidade: 'sob_encomenda', estoque: 0 }

test('aprovação retira do carrinho só as quantidades pagas', () => {
  const carrinho = adicionarItem(adicionarItem([], manta), toalha)
  const restante = descontarItensPagos(carrinho, [{ pecaId: 'manta', quantidade: 2 }])
  assert.deepEqual(restante.map(i => [i.id, i.quantidade]), [['toalha', 1]])
})

test('peças adicionadas depois da preparação continuam no carrinho', () => {
  const carrinho = adicionarItem([], { ...manta, quantidade: 3 })
  const restante = descontarItensPagos(carrinho, [{ pecaId: 'manta', quantidade: 2 }])
  assert.deepEqual(restante.map(i => [i.id, i.quantidade]), [['manta', 1]])
})

test('itens pagos inválidos ou ausentes não alteram o carrinho', () => {
  const carrinho = adicionarItem([], manta)
  for (const pagos of [null, undefined, {}, [{ pecaId: 'manta', quantidade: -1 }], [{ pecaId: 'manta', quantidade: 1.5 }], [{ quantidade: 2 }]]) {
    assert.deepEqual(descontarItensPagos(carrinho, pagos), carrinho)
  }
})

test('tentativa guardada mantém só ID da sessão, peças e quantidades', () => {
  const valor = serializarTentativa('sessao-1', [{ pecaId: 'manta', quantidade: 2, precoCentavos: 5000, cpf: 'privado' }])
  assert.deepEqual(JSON.parse(valor), { sessaoId: 'sessao-1', itens: [{ pecaId: 'manta', quantidade: 2 }] })
  assert.deepEqual(lerTentativa(valor), { sessaoId: 'sessao-1', itens: [{ pecaId: 'manta', quantidade: 2 }] })
})

test('formato antigo, só com o ID, continua recuperando a tentativa', () => {
  assert.deepEqual(lerTentativa('2f1c3a9e-0000-4000-8000-000000000000'), { sessaoId: '2f1c3a9e-0000-4000-8000-000000000000', itens: null })
  assert.equal(lerTentativa(''), null)
  assert.equal(lerTentativa(null), null)
})

test('retomada em outro aparelho só vale para tentativa aberta e dentro do prazo', () => {
  const agora = Date.parse('2026-11-20T12:00:00Z')
  const futuro = '2026-11-20T12:20:00Z', passado = '2026-11-20T11:40:00Z'
  assert.equal(tentativaRetomavel({ estado: 'pendente', expiraEm: futuro }, agora), true)
  assert.equal(tentativaRetomavel({ estado: 'preparado', expiraEm: futuro }, agora), true)
  assert.equal(tentativaRetomavel({ estado: 'processando', expiraEm: passado }, agora), true)
  assert.equal(tentativaRetomavel({ estado: 'pendente', expiraEm: passado }, agora), false)
  assert.equal(tentativaRetomavel({ estado: 'preparado', expiraEm: passado }, agora), false)
  for (const estado of ['aprovado', 'cancelado', 'expirado', 'recusado', 'estornado']) assert.equal(tentativaRetomavel({ estado, expiraEm: futuro }, agora), false)
  assert.equal(tentativaRetomavel(null, agora), false)
})

test('busca da tentativa aberta filtra o pedido novo e pendente mais recente da própria conta', async () => {
  const chamadas = []
  const consulta = {}
  for (const metodo of ['select', 'eq', 'gte', 'order', 'limit']) consulta[metodo] = (...args) => { chamadas.push([metodo, ...args]); return metodo === 'limit' ? Promise.resolve({ data: [{ id: 'pedido-1' }], error: null }) : consulta }
  const buscar = criarBuscaTentativaAberta({ from: tabela => { chamadas.push(['from', tabela]); return consulta } })
  const agora = Date.parse('2026-11-20T12:00:00Z')
  assert.equal(await buscar('cliente-1', agora), 'pedido-1')
  assert.deepEqual(chamadas, [
    ['from', 'pedidos'], ['select', 'id'],
    ['eq', 'cliente_id', 'cliente-1'], ['eq', 'status_pedido', 'novo'], ['eq', 'status_pagamento', 'pendente'],
    ['gte', 'criado_em', '2026-11-19T12:00:00.000Z'], ['order', 'criado_em', { ascending: false }], ['limit', 1],
  ])
  assert.equal(await criarBuscaTentativaAberta(null)('cliente-1'), null)
  assert.equal(await buscar(null), null)
})

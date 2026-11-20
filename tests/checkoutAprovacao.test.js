import test from 'node:test'
import assert from 'node:assert/strict'
import { adicionarItem, descontarItensPagos } from '../src/carrinho/modelo.js'
import { lerTentativa, serializarTentativa } from '../src/servicos/checkoutModelo.js'

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

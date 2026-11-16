import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularIndicadoresCatalogo } from '../src/paginas/Admin/indicadoresCatalogo.js'

test('indicadores contam as três peças ativas, duas visíveis e uma oculta', () => {
  const pecas = Object.freeze([
    Object.freeze({ id: 'kit', visivel: true }),
    Object.freeze({ id: 'manta', visivel: true, arquivada: false }),
    Object.freeze({ id: 'toalha', visivel: false }),
  ])

  assert.deepEqual(calcularIndicadoresCatalogo(pecas), { total: 3, visiveis: 2, ocultas: 1 })
})

test('arquivadas não entram em nenhum indicador, mesmo se ainda estiverem marcadas como visíveis', () => {
  const pecas = [
    { visivel: true, arquivada: true },
    { visivel: false, arquivada: true },
    { visivel: false, arquivada: false },
  ]

  assert.deepEqual(calcularIndicadoresCatalogo(pecas), { total: 1, visiveis: 0, ocultas: 1 })
})

test('peça sob encomenda visível com estoque zero continua contabilizada na vitrine', () => {
  assert.deepEqual(calcularIndicadoresCatalogo([
    { visivel: true, tipoDisponibilidade: 'sob_encomenda', estoque: 0 },
    { visivel: false, tipoDisponibilidade: 'pronta_entrega', estoque: 8 },
  ]), { total: 2, visiveis: 1, ocultas: 1 })
})

test('catálogo vazio e catálogo inteiramente arquivado apresentam zero nos três indicadores', () => {
  const vazio = { total: 0, visiveis: 0, ocultas: 0 }
  assert.deepEqual(calcularIndicadoresCatalogo([]), vazio)
  assert.deepEqual(calcularIndicadoresCatalogo([{ visivel: true, arquivada: true }]), vazio)
})

test('ausência de uma lista válida não é interpretada como catálogo vazio', () => {
  for (const invalido of [undefined, null, {}, '', 0]) {
    assert.throws(() => calcularIndicadoresCatalogo(invalido), Error)
  }
})

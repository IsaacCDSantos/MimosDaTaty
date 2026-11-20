import test from 'node:test'
import assert from 'node:assert/strict'
import { montarTitulo, resumirDescricao, seoDaRota, DESCRICAO_PADRAO } from '../src/servicos/seo.js'
import { slugDaPeca } from '../src/servicos/slug.js'

test('título de cada página leva o nome da loja uma única vez', () => {
  assert.equal(montarTitulo('Kit Berço'), 'Kit Berço | Mimos da Tati')
  assert.equal(montarTitulo('Mimos da Tati | Enxoval'), 'Mimos da Tati | Enxoval')
  assert.equal(montarTitulo(''), 'Mimos da Tati')
  assert.equal(montarTitulo(null), 'Mimos da Tati')
})

test('descrição para o Google é curta, sem quebras e nunca vazia', () => {
  assert.equal(resumirDescricao('  Manta\n\nmacia  '), 'Manta macia')
  assert.equal(resumirDescricao(''), DESCRICAO_PADRAO)
  const longa = resumirDescricao('palavra '.repeat(60))
  assert.ok(longa.length <= 160)
  assert.ok(longa.endsWith('…'))
})

test('páginas públicas são indexadas e as privadas não', () => {
  assert.equal(seoDaRota('/').indexar, true)
  assert.equal(seoDaRota('/catalogo').titulo, 'Catálogo de peças | Mimos da Tati')
  assert.equal(seoDaRota('/catalogo/').indexar, true)
  for (const rota of ['/checkout', '/carrinho', '/login', '/meus-pedidos', '/admin', '/admin/pedidos', '/qualquer']) {
    assert.equal(seoDaRota(rota).indexar, false, rota)
  }
})

test('página de peça fica a cargo do catálogo e usa o mesmo endereço do sitemap', () => {
  assert.equal(seoDaRota('/catalogo/kit-berco-1'), null)
  assert.equal(slugDaPeca({ id: 'abc', nome: 'Kit Berço Florido' }), 'kit-berco-florido-abc')
})

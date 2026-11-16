import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

let servidor
let Checkout
let ResumoCheckout
let CarrinhoContexto

before(async () => {
  servidor = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false },
    logLevel: 'error',
  })
  ;({ default: Checkout, ResumoCheckout } = await servidor.ssrLoadModule('/src/paginas/Checkout/Checkout.jsx'))
  ;({ CarrinhoContexto } = await servidor.ssrLoadModule('/src/carrinho/contexto.js'))
})

after(async () => { await servidor?.close() })

function renderizarResumo(props = {}) {
  return renderToStaticMarkup(React.createElement(ResumoCheckout, {
    subtotal: 9000, total: 9000, aoEditarCarrinho() {}, ...props,
  })).replace(/\s/g, ' ')
}

test('sem frete, o resumo identifica o total parcial e orienta a seleção', () => {
  const html = renderizarResumo()
  assert.match(html, /Subtotal<\/span><strong>R\$ 90,00/)
  assert.match(html, /Frete<\/span><strong>A calcular/)
  assert.match(html, /Total parcial<\/span><span class="valor-total">R\$ 90,00/)
  assert.match(html, /Selecione o frete para incluir o envio no total\./)
  assert.match(html, /Editar carrinho/)
  assert.doesNotMatch(html, /Inclui o frete selecionado|Valores registrados/)
})

for (const { precoCentavos, total, frete, valor } of [
  { precoCentavos: 1850, total: 10850, frete: '18,50', valor: '108,50' },
  { precoCentavos: 0, total: 9000, frete: '0,00', valor: '90,00' },
]) {
  test(`frete selecionado de R$ ${frete} exibe o total e confirma o envio incluído`, () => {
    const html = renderizarResumo({ selecionada: { id: 'pac', precoCentavos }, total })
    assert.ok(html.includes(`Frete</span><strong>R$ ${frete}`))
    assert.ok(html.includes(`Total</span><span class="valor-total">R$ ${valor}`))
    assert.match(html, /Inclui o frete selecionado\./)
    assert.match(html, /Editar carrinho/)
    assert.doesNotMatch(html, /Total parcial|A calcular|Selecione o frete|Valores registrados/)
  })
}

for (const selecionada of [null, { id: 'outra-cotacao', precoCentavos: 9999 }]) {
  test(`pedido registrado preserva o resumo persistido ${selecionada ? 'com outra cotação local' : 'sem cotação local'}`, () => {
    const html = renderizarResumo({ atual: { numeroPedido: 42 }, subtotal: 100, total: 10850, selecionada })
    assert.match(html, /Valores registrados para este pedido\./)
    assert.match(html, /Total<\/span><span class="valor-total">R\$ 108,50/)
    assert.match(html, /Inclui o envio escolhido\. Os juros de parcelamento, quando houver, aparecem nas opções do cartão\./)
    assert.match(html, /Pedido 42/)
    assert.doesNotMatch(html, /Selecione o frete|A calcular|Total parcial|resumo-linhas|Editar carrinho|Inclui o frete selecionado/)
  })
}

test('Checkout passa o subtotal do carrinho ao resumo antes de selecionar frete', () => {
  const contexto = { itens: [{ id: 'peca-teste', precoCentavos: 4500, quantidade: 2 }], subtotalCentavos: 9000 }
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, {},
    React.createElement(CarrinhoContexto.Provider, { value: contexto }, React.createElement(Checkout))))
  const resumo = html.match(/<aside class="card-resumo">[\s\S]*?<\/aside>/)?.[0].replace(/\s/g, ' ')
  assert.ok(resumo)
  assert.match(resumo, /Total parcial<\/span><span class="valor-total">R\$ 90,00/)
  assert.match(resumo, /Selecione o frete para incluir o envio no total\./)
})

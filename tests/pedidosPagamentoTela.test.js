import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { mapearPedidoSupabase } from '../src/servicos/pedidosAdmin.js'

test('lista e detalhes distinguem pagamento e andamento e bloqueiam ações financeiras', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: PedidosAdmin, DetalhesPedido } = await vite.ssrLoadModule('/src/paginas/Admin/Pedidos/PedidosAdmin.jsx')
    for (const [statusPagamento, rotulo] of [
      ['pendente', 'Aguardando pagamento'], ['aprovado', 'Pagamento aprovado'],
      ['recusado', 'Pagamento recusado'], ['cancelado', 'Pagamento cancelado'],
      ['estornado', 'Pagamento estornado'], [undefined, 'Pagamento não informado'],
      ['desconhecido', 'Pagamento não informado'],
    ]) {
      const pedido = mapearPedidoSupabase({
        id: '00000000-0000-4000-8000-000000000001', numero_pedido: 1011,
        criado_em: '2026-11-16T12:00:00Z', status_pedido: 'novo', status_pagamento: statusPagamento,
      })
      const lista = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(PedidosAdmin, { pedidosIniciais: [pedido] })))
      assert.match(lista, /<th scope="col">Andamento<\/th><th scope="col">Pagamento<\/th>/)
      assert.match(lista, /data-label="Andamento"><span[^>]*>Novo<\/span>/)
      assert.ok(lista.includes(rotulo))
      assert.ok(lista.includes('#1011'))

      const detalhes = renderToStaticMarkup(createElement(DetalhesPedido, { pedido, aoAlterar() {}, aoFechar() {} }))
      assert.ok(detalhes.includes('Status do pagamento'))
      assert.ok(detalhes.includes(rotulo))
      const botao = detalhes.match(/<button[^>]*>Marcar como em produção<\/button>/)?.[0]
      assert.ok(botao)
      assert.equal(botao.includes('disabled=""'), statusPagamento !== 'aprovado')
      assert.equal(botao.includes('aria-describedby="orders-admin-payment-block"'), statusPagamento !== 'aprovado')
      const salvar = detalhes.match(/<button[^>]*>Salvar observação<\/button>/)?.[0]
      assert.ok(salvar && !salvar.includes('disabled'))

      const legado = renderToStaticMarkup(createElement(DetalhesPedido, { pedido: { ...pedido, status: 'em_producao' }, aoAlterar() {}, aoFechar() {} }))
      const voltar = legado.match(/<button[^>]*>Voltar para Novo<\/button>/)?.[0]
      assert.ok(voltar && !voltar.includes('disabled'))
      const enviar = legado.match(/<button[^>]*>Marcar como enviado<\/button>/)?.[0]
      assert.equal(enviar.includes('disabled=""'), statusPagamento !== 'aprovado')
      const enviado = renderToStaticMarkup(createElement(DetalhesPedido, { pedido: { ...pedido, status: 'enviado', codigoRastreio: 'TESTE' }, aoAlterar() {}, aoFechar() {} }))
      const entregar = enviado.match(/<button[^>]*>Marcar como entregue<\/button>/)?.[0]
      assert.equal(entregar.includes('disabled=""'), statusPagamento !== 'aprovado')
    }
  } finally {
    await vite.close()
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { mapearPedidoSupabase } from '../src/servicos/pedidosAdmin.js'
import { mapearPedidoCliente } from '../src/servicos/pedidosCliente.js'

const ID = '10000000-0000-4000-8000-000000000001'
const caminho = `${ID}/${ID}/${ID}/${'a'.repeat(64)}.png`
const referencias = [{ caminho, nome: '<azul & rosa>.png', dataUrl: 'data:image/png;base64,segredo', url: 'https://evil.example/' }]
const row = { id: ID, numero_pedido: 42, criado_em: '2026-11-16T12:00:00Z', status_pedido: 'novo', status_pagamento: 'pendente', subtotal_centavos: 1000, frete_centavos: 0, total_centavos: 1000 }
const item = { id: ID, pedido_id: ID, nome_peca_snapshot: 'Manta', preco_unitario_centavos: 1000, quantidade: 1, personalizacao: '<script>alert("texto")</script>\nAzul & rosa', referencias }

test('detalhes admin e cliente mostram nota escapada por peça e carregam fotos apenas ao abrir', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    const { default: PedidosAdmin, DetalhesPedido: Admin } = await vite.ssrLoadModule('/src/paginas/Admin/Pedidos/PedidosAdmin.jsx')
    const { DetalhesPedido: Cliente } = await vite.ssrLoadModule('/src/paginas/MeusPedidos/MeusPedidos.jsx')
    const admin = mapearPedidoSupabase({ ...row, itens_pedido: [item] })
    const cliente = mapearPedidoCliente(row, [item], 'https://projeto.supabase.co')
    for (const html of [renderToStaticMarkup(createElement(Admin, { pedido: admin })), renderToStaticMarkup(createElement(Cliente, { pedido: cliente }))]) {
      assert.match(html, /Personalização:/)
      assert.ok(html.includes('&lt;script&gt;alert(&quot;texto&quot;)&lt;/script&gt;'))
      assert.ok(html.includes('Azul &amp; rosa'))
      assert.match(html, /Carregando fotos de referência/)
      assert.doesNotMatch(html, /<script>|data:image|base64|evil\.example|storage\/v1\/object/)
    }
    const lista = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(PedidosAdmin, { pedidosIniciais: [admin] })))
    assert.match(lista, /1× Manta/)
    assert.doesNotMatch(lista, /Carregando fotos|Azul &amp; rosa|Personalização:/)
    const legado = renderToStaticMarkup(createElement(Admin, { pedido: mapearPedidoSupabase({ ...row, itens_pedido: [{ ...item, referencias: undefined }] }) }))
    assert.match(legado, /Personalização:/)
    assert.doesNotMatch(legado, /Carregando fotos/)
  } finally { await vite.close() }
})

test('galeria oferece estados acessíveis de carga, falha, retry e links privados em nova aba', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    const { GaleriaReferenciasPedido } = await vite.ssrLoadModule('/src/componentes/ReferenciasPedido/ReferenciasPedido.jsx')
    const render = estado => renderToStaticMarkup(createElement(GaleriaReferenciasPedido, { estado }))
    assert.match(render({ situacao: 'carregando', fotos: [] }), /role="status"/)
    const erro = render({ situacao: 'erro', fotos: [] })
    assert.match(erro, /role="alert"/)
    assert.match(erro, /<button type="button">Tentar carregar fotos novamente/)
    const url = 'https://projeto.supabase.co/storage/v1/object/sign/referencias-pedidos/' + caminho + '?token=curto'
    const pronto = render({ situacao: 'pronto', fotos: [{ caminho, nome: referencias[0].nome, url }] })
    assert.match(pronto, /target="_blank" rel="noopener noreferrer"/)
    assert.match(pronto, /aria-label="Abrir referência &lt;azul &amp; rosa&gt;.png em nova aba"/)
    assert.match(pronto, /referrerPolicy="no-referrer"/)
    assert.ok(pronto.includes(url))
    assert.doesNotMatch(pronto, /base64|data:image|<azul/)
  } finally { await vite.close() }
})

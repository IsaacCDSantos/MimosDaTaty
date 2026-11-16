import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { atualizarPedidoAdmin, carregarPedidosAdmin, dataNaLoja, mapearPedidoSupabase } from '../src/servicos/pedidosAdmin.js'
import { calcularResumo, filtrarPedidos } from '../src/paginas/Admin/Pedidos/pedidosModelo.js'
import { supabaseSimulado } from './apoio/supabaseSimulado.js'

function registro(id = '0001') {
  return {
    id, numero_pedido: Number(id), criado_em: '2026-11-15T01:30:00+00:00', atualizado_em: '2026-11-15T01:30:00+00:00',
    status_pedido: 'novo', status_pagamento: 'aprovado', cliente_nome_snapshot: 'Compradora', entrega_destinatario: 'Destinatária diferente',
    entrega_ponto_referencia: 'Portaria dos fundos', forma_pagamento: 'pix',
    subtotal_centavos: 10000, frete_centavos: 1500, total_centavos: 11500,
    itens_pedido: [{ id: `item-${id}`, quantidade: 2, preco_unitario_centavos: 5000, nome_peca_snapshot: 'Manta', personalizacao: 'Azul' }],
  }
}

test('data usa fuso da loja, inclusive mudança de mês e ano', () => {
  assert.equal(dataNaLoja('2026-11-15T01:30:00Z'), '2026-11-14')
  assert.equal(dataNaLoja('2027-01-01T01:00:00Z'), '2026-12-31')
  assert.equal(dataNaLoja('2026-11-15T12:00:00Z'), '2026-11-15')
  assert.throws(() => dataNaLoja('invalida'), /data/)
})

test('mapeamento mantém destinatário, referência, personalização, versão e valores', () => {
  const pedido = mapearPedidoSupabase(registro())
  assert.equal(pedido.endereco.destinatario, 'Destinatária diferente')
  assert.equal(pedido.endereco.referencia, 'Portaria dos fundos')
  assert.equal(pedido.data, '2026-11-14')
  assert.equal(pedido.atualizadoEm, registro().atualizado_em)
  assert.equal(pedido.itens[0].nome, 'Manta (Azul)')
  assert.equal(calcularResumo(pedido).total, 115)
  assert.equal(pedido.formaPagamento, 'Pix')
  assert.equal(pedido.statusPagamento, 'aprovado')
})

test('carrega mais de 1000 pedidos e todos os itens mesmo com limite da API menor que o lote', async () => {
  const rows = Array.from({ length: 1005 }, (_, i) => registro(String(i + 1).padStart(5, '0')))
  const itens = rows.flatMap(row => [0, 1].map(i => ({ id: `${row.id}-${i}`, pedido_id: row.id, quantidade: 1, preco_unitario_centavos: 5000, nome_peca_snapshot: 'Manta' })))
  const cliente = supabaseSimulado(c => {
    const cursor = c.filtros.find(f => f[2] === 'gt')?.[1]
    const ids = c.filtros.find(f => f[2] === 'in')?.[1]
    const fonte = c.tabela === 'pedidos' ? rows : itens.filter(item => ids.includes(item.pedido_id))
    return { data: fonte.filter(item => !cursor || item.id > cursor).slice(0, 37), error: null }
  })
  const pedidos = await carregarPedidosAdmin(cliente)
  assert.equal(pedidos.length, 1005)
  assert.equal(new Set(pedidos.map(pedido => pedido.uuid)).size, 1005)
  assert.ok(pedidos.every(pedido => pedido.itens.length === 2 && calcularResumo(pedido).total === 115))
  assert.equal(filtrarPedidos(pedidos, { busca: '1005' }).length, 1)
  assert.ok(cliente.chamadas.filter(c => c.tabela === 'pedidos').every(c => c.filtros.some(f => f[0] === 'status_pedido' && f[1] === 'cancelado' && f[2] === 'neq')))
})

test('erro em um lote não retorna lista parcial como se fosse completa', async () => {
  let chamadas = 0
  const cliente = supabaseSimulado(() => ++chamadas === 1 ? { data: [registro()], error: null } : { data: null, error: { message: 'Conexão interrompida' } })
  await assert.rejects(carregarPedidosAdmin(cliente), /Conexão interrompida/)
})

test('cancelamento do carregamento interrompe as próximas consultas', async () => {
  const controller = new AbortController()
  const cliente = supabaseSimulado(() => { controller.abort(); return { data: [registro()], error: null } })
  await assert.rejects(carregarPedidosAdmin(cliente, controller.signal), { name: 'AbortError' })
  assert.equal(cliente.chamadas.length, 1)
})

test('pedido cancelado em outra sessão não é reativado pela tela antiga', async () => {
  const pedido = mapearPedidoSupabase(registro())
  const banco = { ...registro(), status_pedido: 'cancelado', atualizado_em: 'nova-versao' }
  const cliente = supabaseSimulado(c => {
    const corresponde = c.filtros.every(([campo, valor]) => banco[campo] === valor)
    if (corresponde) Object.assign(banco, c.dados)
    return { data: corresponde ? banco : null, error: null }
  })
  await assert.rejects(atualizarPedidoAdmin(cliente, pedido, { status_pedido: 'em_producao' }), /não foi alterado/)
  assert.equal(banco.status_pedido, 'cancelado')
})

test('mudança concorrente de observação também invalida a versão anterior', async () => {
  const pedido = mapearPedidoSupabase(registro())
  const cliente = supabaseSimulado(c => {
    assert.ok(c.filtros.some(([campo, valor]) => campo === 'atualizado_em' && valor === pedido.atualizadoEm))
    return { data: null, error: null }
  })
  await assert.rejects(atualizarPedidoAdmin(cliente, pedido, { observacao_interna: 'nova' }), /não foi alterado/)
})

test('atualização devolve dados e versão confirmados pelo servidor', async () => {
  const pedido = mapearPedidoSupabase(registro())
  const cliente = supabaseSimulado(() => ({ data: { id: pedido.uuid, status_pedido: 'enviado', status_pagamento: 'aprovado', atualizado_em: 'nova-versao', codigo_rastreio: 'RASTREIO', observacao_interna: 'Confirmada' }, error: null }))
  const resultado = await atualizarPedidoAdmin(cliente, pedido, { status_pedido: 'enviado', codigo_rastreio: 'RASTREIO' })
  assert.equal(resultado.atualizadoEm, 'nova-versao')
  assert.equal(resultado.codigoRastreio, 'RASTREIO')
  assert.equal(resultado.observacaoInterna, 'Confirmada')
  assert.equal(resultado.statusPagamento, 'aprovado')
  assert.deepEqual(resultado.itens, pedido.itens)
  assert.equal(pedido.status, 'novo')
})

test('erro de gravação não produz um pedido atualizado', async () => {
  const cliente = supabaseSimulado(() => ({ data: null, error: { message: 'Rede indisponível' } }))
  await assert.rejects(atualizarPedidoAdmin(cliente, mapearPedidoSupabase(registro()), { observacao_interna: 'Teste' }), /Atualize a lista/)
})

test('SDK real envia filtros de concorrência e solicita registro de retorno', async () => {
  const pedido = mapearPedidoSupabase(registro())
  let requisicao
  const cliente = createClient('https://example.test', 'chave-de-teste', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      requisicao = { url: new URL(url), init }
      return new Response(JSON.stringify({ id: pedido.uuid, status_pedido: 'em_producao', status_pagamento: 'aprovado', atualizado_em: 'versao-confirmada' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  const resultado = await atualizarPedidoAdmin(cliente, pedido, { status_pedido: 'em_producao' })
  assert.equal(requisicao.init.method, 'PATCH')
  assert.equal(requisicao.url.searchParams.get('status_pedido'), 'eq.novo')
  assert.equal(requisicao.url.searchParams.get('atualizado_em'), `eq.${pedido.atualizadoEm}`)
  assert.equal(requisicao.url.searchParams.get('status_pagamento'), 'eq.aprovado')
  assert.match(new Headers(requisicao.init.headers).get('prefer'), /return=representation/)
  assert.equal(resultado.atualizadoEm, 'versao-confirmada')
})

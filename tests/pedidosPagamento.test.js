import test from 'node:test'
import assert from 'node:assert/strict'
import { atualizarPedidoAdmin, mapearPedidoSupabase } from '../src/servicos/pedidosAdmin.js'
import { mudarStatus, obterStatusPagamento, salvarObservacao, salvarRastreio } from '../src/paginas/Admin/Pedidos/pedidosModelo.js'
import { supabaseSimulado } from './apoio/supabaseSimulado.js'

const registro = {
  id: '00000000-0000-4000-8000-000000000001', numero_pedido: 1011,
  criado_em: '2026-11-16T12:00:00Z', atualizado_em: '2026-11-16T12:00:00Z',
  status_pedido: 'novo', status_pagamento: 'pendente', forma_pagamento: 'pix',
}
const naoAprovados = ['pendente', 'recusado', 'cancelado', 'estornado', null, undefined, '', 'desconhecido', 'approved', 'APROVADO']
const transicoesProtegidas = [
  ['novo', 'em_producao'], ['em_producao', 'enviado'], ['enviado', 'entregue'],
  ['entregue', 'enviado'], ['enviado', 'em_producao'],
]

test('status financeiro é explícito e independente do andamento e da forma de pagamento', () => {
  for (const status of ['aprovado', ...naoAprovados]) {
    const pedido = mapearPedidoSupabase({ ...registro, status_pagamento: status })
    assert.equal(pedido.status, 'novo')
    assert.equal(pedido.statusPagamento, status ?? null)
    assert.equal(pedido.formaPagamento, 'Pix')
  }
  assert.equal(obterStatusPagamento('pendente').rotulo, 'Aguardando pagamento')
  for (const status of [undefined, null, '', 'desconhecido']) {
    assert.equal(obterStatusPagamento(status).rotulo, 'Pagamento não informado')
  }
})

for (const statusPagamento of naoAprovados) {
  test(`pagamento ${String(statusPagamento)} bloqueia etapas protegidas no modelo e serviço`, async () => {
    const cliente = supabaseSimulado(() => assert.fail('Não deve gravar um pedido sem aprovação'))
    for (const [origem, destino] of transicoesProtegidas) {
      const pedido = { ...mapearPedidoSupabase(registro), status: origem, statusPagamento, codigoRastreio: 'TESTE' }
      assert.throws(() => mudarStatus(pedido, destino), /pagamento aprovado/)
      await assert.rejects(atualizarPedidoAdmin(cliente, pedido, { status_pedido: destino }), /pagamento aprovado/)
      assert.equal(pedido.status, origem)
    }
    assert.equal(cliente.chamadas.length, 0)
  })
}

test('aprovado permite todas as etapas e retornos preservando rastreio e filtros atômicos', async () => {
  for (const [origem, destino] of [...transicoesProtegidas, ['em_producao', 'novo']]) {
    const pedido = { ...mapearPedidoSupabase(registro), status: origem, statusPagamento: 'aprovado', codigoRastreio: 'TESTE' }
    const atualizado = mudarStatus(pedido, destino)
    const cliente = supabaseSimulado(c => {
      assert.ok(c.filtros.some(([campo, valor]) => campo === 'status_pedido' && valor === origem))
      assert.ok(c.filtros.some(([campo, valor]) => campo === 'atualizado_em' && valor === pedido.atualizadoEm))
      assert.equal(c.filtros.some(([campo, valor]) => campo === 'status_pagamento' && valor === 'aprovado'), destino !== 'novo')
      return { data: { ...registro, ...c.dados, status_pagamento: 'aprovado', atualizado_em: 'versao-confirmada' }, error: null }
    })
    const confirmado = await atualizarPedidoAdmin(cliente, pedido, { status_pedido: atualizado.status, codigo_rastreio: atualizado.codigoRastreio })
    assert.equal(confirmado.status, destino)
    assert.equal(confirmado.codigoRastreio, 'TESTE')
    assert.equal(confirmado.statusPagamento, 'aprovado')
  }
})

test('legados sem aprovação permitem observação, rastreio sem mudança logística e retorno a novo', async () => {
  for (const statusPagamento of naoAprovados) {
    const pedido = { ...mapearPedidoSupabase(registro), status: 'enviado', statusPagamento, codigoRastreio: 'TESTE' }
    assert.equal(salvarObservacao(pedido, '  Conferir  ').observacaoInterna, 'Conferir')
    assert.equal(salvarRastreio(pedido, ' NOVO ').codigoRastreio, 'NOVO')
    assert.equal(mudarStatus({ ...pedido, status: 'em_producao' }, 'novo').status, 'novo')
    for (const payload of [{ observacao_interna: 'Conferir' }, { codigo_rastreio: 'NOVO' }, { status_pedido: 'enviado', observacao_interna: 'Conferir' }, { status_pedido: 'novo' }, { status_pedido: 'cancelado' }]) {
      const cliente = supabaseSimulado(c => {
        assert.ok(!c.filtros.some(([campo]) => campo === 'status_pagamento'))
        return { data: { ...registro, status_pedido: pedido.status, status_pagamento: statusPagamento, ...c.dados }, error: null }
      })
      await atualizarPedidoAdmin(cliente, pedido, payload)
    }
  }
})

test('revogação financeira concorrente bloqueia a gravação mesmo com timestamp igual', async () => {
  for (const status_pagamento of ['pendente', 'recusado', 'cancelado', 'estornado']) {
    const pedido = mapearPedidoSupabase({ ...registro, status_pagamento: 'aprovado' })
    const banco = { ...registro, status_pagamento }
    const cliente = supabaseSimulado(c => {
      const corresponde = c.filtros.every(([campo, valor]) => banco[campo] === valor)
      if (corresponde) Object.assign(banco, c.dados)
      return { data: corresponde ? banco : null, error: null }
    })
    await assert.rejects(atualizarPedidoAdmin(cliente, pedido, { status_pedido: 'em_producao' }), /não foi alterado/)
    assert.equal(banco.status_pedido, 'novo')
    assert.equal(banco.status_pagamento, status_pagamento)
  }
})

test('salvar observação atualiza o status financeiro com a resposta do servidor, sem inferir aprovação', async () => {
  for (const status_pagamento of [...naoAprovados, 'aprovado']) {
    const pedido = mapearPedidoSupabase({ ...registro, status_pagamento: 'aprovado' })
    const cliente = supabaseSimulado(c => {
      assert.match(c.colunas, /status_pagamento/)
      return { data: { ...registro, status_pagamento, observacao_interna: 'Confirmada' }, error: null }
    })
    const confirmado = await atualizarPedidoAdmin(cliente, pedido, { observacao_interna: 'Confirmada' })
    assert.equal(confirmado.statusPagamento, status_pagamento ?? null)
    assert.equal(pedido.statusPagamento, 'aprovado')
  }
})

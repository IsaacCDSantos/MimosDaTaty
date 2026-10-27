import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularResumo, contarStatus, filtrarPedidos, formatarData, mudarStatus, salvarObservacao, salvarRastreio } from '../src/paginas/Admin/Pedidos/pedidosModelo.js'

function congelar(valor) {
  if (valor && typeof valor === 'object') {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}
const pedido = congelar({ id: 1042, data: '2026-09-29', status: 'novo', cliente: { nome: 'Patrícia Rocha' }, itens: [{ nome: 'Kit de berço', quantidade: 2, precoUnitario: 189 }], frete: 54, desconto: 0, codigoRastreio: '', observacaoCliente: 'Acabamento rosa.', observacaoInterna: '' })

test('resumo financeiro calcula quantidades, frete e desconto em centavos', () => {
  assert.deepEqual(calcularResumo(pedido), { subtotal: 378, frete: 54, desconto: 0, total: 432 })
  assert.deepEqual(calcularResumo({ itens: [{ quantidade: 3, precoUnitario: 0.1 }], frete: 0.2, desconto: 0.1 }), { subtotal: 0.3, frete: 0.2, desconto: 0.1, total: 0.4 })
  assert.throws(() => calcularResumo({ ...pedido, desconto: 500 }), /desconto/)
  assert.throws(() => calcularResumo({ ...pedido, frete: -1 }), /frete/)
})

test('busca combina status, nome sem acento e numero com cerquilha', () => {
  const fonte = [pedido, { ...pedido, id: 1041, status: 'em_producao', cliente: { nome: 'Camila Andrade' } }]
  assert.equal(filtrarPedidos(fonte, { busca: ' PATRICIA ' })[0].id, 1042)
  assert.equal(filtrarPedidos(fonte, { busca: '#1042' })[0].id, 1042)
  assert.equal(filtrarPedidos(fonte, { status: 'em_producao', busca: 'CAMÍLA 1041' })[0].id, 1041)
  assert.deepEqual(filtrarPedidos(fonte, { status: 'entregue' }), [])
  assert.equal(fonte.length, 2)
})

test('contadores refletem atualizacoes sem depender do filtro da lista', () => {
  const fonte = [pedido, { ...pedido, id: 1041, status: 'em_producao' }, { ...pedido, id: 1040, status: 'enviado', codigoRastreio: 'EXEMPLO-1040' }, { ...pedido, id: 1039, status: 'entregue' }]
  assert.deepEqual(contarStatus(fonte), { novo: 1, em_producao: 1, enviado: 1, entregue: 1 })
  const atualizados = fonte.map(item => item.id === 1042 ? mudarStatus(item, 'em_producao') : item)
  assert.deepEqual(contarStatus(atualizados), { novo: 0, em_producao: 2, enviado: 1, entregue: 1 })
  assert.equal(pedido.status, 'novo')
})

test('andamento permite apenas a etapa seguinte ou anterior', () => {
  const producao = mudarStatus(pedido, 'em_producao')
  assert.equal(producao.status, 'em_producao')
  assert.equal(mudarStatus(producao, 'novo').status, 'novo')
  assert.throws(() => mudarStatus(pedido, 'enviado', 'EXEMPLO'), /uma etapa/)
  assert.throws(() => mudarStatus(pedido, 'novo'), /uma etapa/)
  assert.throws(() => mudarStatus(pedido, 'cancelado'), /inválido/)
})

test('envio exige rastreio e o codigo fica preservado ao voltar uma etapa', () => {
  const producao = mudarStatus(pedido, 'em_producao')
  assert.throws(() => mudarStatus(producao, 'enviado', '   '), /rastreio/)
  const enviado = mudarStatus(producao, 'enviado', ' EXEMPLO-1042 ')
  assert.equal(enviado.codigoRastreio, 'EXEMPLO-1042')
  const entregue = mudarStatus(enviado, 'entregue')
  assert.equal(mudarStatus(entregue, 'enviado').codigoRastreio, 'EXEMPLO-1042')
  assert.equal(mudarStatus(enviado, 'em_producao').codigoRastreio, 'EXEMPLO-1042')
  assert.equal(pedido.codigoRastreio, '')
})

test('rastreio so pode ser editado em pedido enviado e nao aceita vazio', () => {
  const enviado = { ...pedido, status: 'enviado', codigoRastreio: 'EXEMPLO-ANTIGO' }
  assert.throws(() => salvarRastreio(pedido, 'EXEMPLO'), /enviados/)
  assert.throws(() => salvarRastreio(enviado, ' '), /rastreio/)
  assert.equal(salvarRastreio(enviado, ' EXEMPLO-NOVO ').codigoRastreio, 'EXEMPLO-NOVO')
  assert.equal(enviado.codigoRastreio, 'EXEMPLO-ANTIGO')
})

test('observacao interna pode ser salva ou limpa sem modificar a observacao da cliente', () => {
  const atualizado = salvarObservacao(pedido, '  Separar tecido rosa.\nConferir bordado.  ')
  assert.equal(atualizado.observacaoInterna, 'Separar tecido rosa.\nConferir bordado.')
  assert.equal(atualizado.observacaoCliente, 'Acabamento rosa.')
  assert.equal(salvarObservacao(atualizado, '').observacaoInterna, '')
  assert.equal(pedido.observacaoInterna, '')
})

test('data e exibida sem deslocamento de fuso e rejeita datas inexistentes', () => {
  assert.equal(formatarData('2026-09-29'), '29/09/2026')
  assert.equal(formatarData('2024-02-29'), '29/02/2024')
  assert.throws(() => formatarData('2026-02-30'), /inválida/)
})

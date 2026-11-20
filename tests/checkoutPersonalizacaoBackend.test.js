import test from 'node:test'
import assert from 'node:assert/strict'
import { validarPreparacao } from '../supabase/functions/checkout/modelo.js'
import { criarHandlerCheckout, lerJson } from '../supabase/functions/checkout/handler.js'

const usuario = '11111111-1111-4111-8111-111111111111'
const chave = '22222222-2222-4222-8222-222222222222'
const peca = '33333333-3333-4333-8333-333333333333'
const outra = '44444444-4444-4444-8444-444444444444'
const caminho = (id = peca, hash = 'a', extensao = 'jpg') => `${usuario}/${chave}/${id}/${hash.repeat(64)}.${extensao}`
const referencia = (id = peca, hash = 'a') => ({ caminho: caminho(id, hash), nome: 'Foto da referência.jpg' })
const base = { chave, metodo: 'pix', cpf: '12345678909', telefone: '85999999999', totalExibidoCentavos: 5000, servicoFrete: '1', endereco: { nome: 'Cliente Teste', cep: '61940005', logradouro: 'Rua Teste', numero: '1', bairro: 'Centro', cidade: 'Maranguape', uf: 'CE' }, itens: [{ pecaId: peca, quantidade: 1 }] }
const validar = itens => validarPreparacao({ ...base, itens }, usuario)
const req = body => new Request('https://loja.test/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer teste' }, body: JSON.stringify(body) })
const config = { ambiente: 'sandbox', token: 'teste', publicKey: 'teste', sellerId: 'teste' }
const deps = extras => ({ config, autenticar: async () => ({ id: usuario, email: 'teste@example.test' }), buscarSessao: async () => null, cotar: async () => ({ ambiente: 'sandbox', subtotalCentavos: 4000, opcoes: [{ id: '1', precoCentavos: 1000 }] }), preparar: async dados => ({ id: chave, ambiente: 'sandbox', requisicao: dados }), ...extras })

test('preserva texto e fotos na peça correta, sem confundir a ordem da lista', async () => {
  const itens = [{ pecaId: outra, quantidade: 2, personalizacao: 'Bordar azul', referencias: [referencia(outra, 'b')] }, { pecaId: peca, quantidade: 1, personalizacao: 'Bordar rosa', referencias: [referencia()] }]
  const h = criarHandlerCheckout(deps({ preparar: async dados => {
    assert.deepEqual(dados.itens, itens)
    return { id: chave, ambiente: 'sandbox', requisicao: dados }
  } }))
  assert.equal((await h(req({ ...base, acao: 'preparar', itens }))).status, 200)
})

test('campos vazios são omitidos e itens sem extras mantêm o contrato legado', () => {
  const esperado = validarPreparacao(base)
  assert.deepEqual(validar([{ pecaId: peca, quantidade: 1, personalizacao: '  ', referencias: [] }]), esperado)
  assert.deepEqual(esperado.itens, [{ pecaId: peca, quantidade: 1 }])
  assert.deepEqual(validar([{ pecaId: peca, quantidade: 1 }, { pecaId: peca.toUpperCase(), quantidade: 2 }]).itens, [{ pecaId: peca, quantidade: 3 }])
})

test('recusa duplicação ambígua de peça personalizada independentemente da ordem', () => {
  const simples = { pecaId: peca, quantidade: 1 }
  for (const extras of [{ personalizacao: 'Azul' }, { referencias: [referencia()] }]) {
    const personalizado = { ...simples, ...extras }
    for (const itens of [[simples, personalizado], [personalizado, simples], [personalizado, personalizado]]) assert.throws(() => validar(itens), { status: 400 })
  }
})

test('limita texto por caracteres Unicode e valida tipos, até 6 imagens e nomes humanos', () => {
  assert.equal(validar([{ ...base.itens[0], personalizacao: '🧶'.repeat(1000) }]).itens[0].personalizacao.length, 2000)
  for (const extra of [{ personalizacao: 'a'.repeat(1001) }, { personalizacao: null }, { personalizacao: {} }, { referencias: null }, { referencias: 'url' }, { referencias: Array.from({ length: 7 }, (_, i) => referencia(peca, String(i))) }, { referencias: [{ ...referencia(), nome: 'x'.repeat(121) }] }, { referencias: [{ ...referencia(), nome: ' ' }] }]) assert.throws(() => validar([{ ...base.itens[0], ...extra }]), { status: 400 })
  assert.equal(validar([{ ...base.itens[0], referencias: Array.from({ length: 6 }, (_, i) => referencia(peca, String(i))) }]).itens[0].referencias.length, 6)
  assert.throws(() => validar(Array.from({ length: 31 }, () => base.itens[0])), { status: 400 })
})

test('recusa outro dono, checkout, peça, URL, data URL, traversal, uppercase, extensão e duplicatas', () => {
  const original = caminho()
  const maliciosos = [original.replace(usuario, outra), original.replace(chave, outra), caminho(outra), 'https://loja.test/' + original, 'data:image/png;base64,aGVsbG8=', original + '?download=1', original.replace('/' + 'a'.repeat(64), '/../' + 'a'.repeat(64)), original.toUpperCase(), original.replace('.jpg', '.jpeg'), original.replace('.jpg', '.svg')]
  for (const valor of maliciosos) assert.throws(() => validar([{ ...base.itens[0], referencias: [{ caminho: valor, nome: 'Foto' }] }]), { codigo: 'REFERENCIAS_INVALIDAS' })
  assert.throws(() => validar([{ ...base.itens[0], referencias: [referencia(), referencia()] }]), { codigo: 'REFERENCIAS_INVALIDAS' })
  assert.throws(() => validar([{ ...base.itens[0], referencias: [{ ...referencia(), bytes: 'base64' }] }]), { codigo: 'REFERENCIAS_INVALIDAS' })
  assert.throws(() => validarPreparacao({ ...base, itens: [{ ...base.itens[0], referencias: [referencia()] }] }), { codigo: 'REFERENCIAS_INVALIDAS' })
})

test('handler usa o usuário autenticado, antes de consultar sessões ou frete', async () => {
  const h = criarHandlerCheckout(deps({ autenticar: async () => ({ id: outra, email: 'outro@example.test' }), buscarSessao: async () => assert.fail('Não deve consultar sessão'), cotar: async () => assert.fail('Não deve cotar') }))
  const r = await h(req({ ...base, acao: 'preparar', itens: [{ ...base.itens[0], referencias: [referencia()] }] }))
  assert.equal(r.status, 400)
  assert.equal((await r.json()).codigo, 'REFERENCIAS_INVALIDAS')
})

test('retry igual recupera sessão; alterar nota ou imagem não reutiliza a sessão anterior', async () => {
  const dados = validar([{ ...base.itens[0], personalizacao: 'Azul', referencias: [referencia()] }])
  const h = criarHandlerCheckout(deps({ buscarSessao: async () => ({ id: chave, ambiente: 'sandbox', requisicao: dados }), mesmaRequisicao: async (s, d) => JSON.stringify(s.requisicao) === JSON.stringify(d), cotar: async () => assert.fail('Não cotar retry'), preparar: async () => assert.fail('Não duplicar pedido') }))
  assert.equal((await h(req({ ...dados, acao: 'preparar' }))).status, 200)
  for (const item of [{ ...dados.itens[0], personalizacao: 'Rosa' }, { ...dados.itens[0], referencias: [referencia(peca, 'b')] }]) {
    const r = await h(req({ ...dados, acao: 'preparar', itens: [item] }))
    assert.equal(r.status, 409)
    assert.equal((await r.json()).codigo, 'TENTATIVA_DIFERENTE')
  }
})

test('leitura aceita metadados acima do limite anterior e recusa acima de 512000 bytes', async () => {
  const json = JSON.stringify({ texto: '🧶'.repeat(12000) })
  const pedido = () => new Request('https://loja.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json })
  assert.equal((await lerJson(pedido())).texto.length, 24000)
  await assert.rejects(() => lerJson(req({ texto: 'x'.repeat(512000) })), { status: 413 })
  let cancelou = false
  const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(512001)); }, cancel() { cancelou = true } })
  await assert.rejects(() => lerJson(new Request('https://loja.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half' })), { status: 413 })
  assert.equal(cancelou, true)
})

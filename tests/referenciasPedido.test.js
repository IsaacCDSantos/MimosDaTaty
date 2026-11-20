import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { createClient } from '@supabase/supabase-js'
import { BUCKET_REFERENCIAS, criarServicoReferenciasPedido, normalizarReferenciasPedido, prepararCheckoutComReferencias } from '../src/servicos/referenciasPedidoModelo.js'
import { normalizarItens } from '../src/carrinho/modelo.js'
import { mapearPedidoSupabase } from '../src/servicos/pedidosAdmin.js'
import { mapearPedidoCliente } from '../src/servicos/pedidosCliente.js'

const DONO = '10000000-0000-4000-8000-000000000001'
const OUTRO = '10000000-0000-4000-8000-000000000002'
const CHAVE = '20000000-0000-4000-8000-000000000001'
const PECA = '30000000-0000-4000-8000-000000000001'
const PECA2 = '30000000-0000-4000-8000-000000000002'
const URL_PROJETO = 'https://projeto.supabase.co'
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEn0AAAAASUVORK5CYII='
const FOTO = { nome: 'Minha inspiração.png', dataUrl: 'data:image/png;base64,' + PNG }
const FOTO2 = { nome: 'Outra inspiração.png', dataUrl: 'data:image/png;base64,' + Buffer.concat([Buffer.from(PNG, 'base64'), Buffer.from([0])]).toString('base64') }
const caminho = hash => `${DONO}/${CHAVE}/${PECA}/${hash || 'a'.repeat(64)}.png`
const ref = { caminho: caminho(), nome: '<inspiração & azul>.png' }
function carrinho(dados = {}) { return [{ id: PECA, quantidade: 2, observacoes: '  Nome: <Clara>\nAzul & rosa  ', imagensReferencia: [FOTO], ...dados }] }
function simular({ usuarios = [DONO], upload, download, assinar, decodificarImagem = async () => {}, timeoutMs } = {}) {
  const chamadas = [], objetos = new Map()
  let autenticacoes = 0
  const storage = {
    async upload(path, blob, opcoes) {
      chamadas.push({ tipo: 'upload', path, blob, opcoes })
      if (upload) return upload(path, blob, opcoes)
      if (objetos.has(path)) return { error: { statusCode: '409' } }
      objetos.set(path, blob)
      return { data: { path }, error: null }
    },
    async download(path) {
      chamadas.push({ tipo: 'download', path })
      return download ? download(path) : { data: objetos.get(path), error: null }
    },
    async createSignedUrls(paths, ttl) {
      chamadas.push({ tipo: 'assinar', paths, ttl })
      return assinar ? assinar(paths, ttl) : { data: paths.map(path => ({ path, signedUrl: `${URL_PROJETO}/storage/v1/object/sign/${BUCKET_REFERENCIAS}/${path}?token=teste` })), error: null }
    },
  }
  const cliente = { supabaseUrl: URL_PROJETO,
    auth: { async getUser() { const id = usuarios[Math.min(autenticacoes++, usuarios.length - 1)]; return { data: { user: id ? { id } : null }, error: null } } },
    storage: { from(bucket) { assert.equal(bucket, BUCKET_REFERENCIAS); return storage } },
  }
  return { chamadas, objetos, servico: criarServicoReferenciasPedido({ cliente, crypto: webcrypto, decodificarImagem, timeoutMs }) }
}
const preparar = (servico, itens = carrinho(), usuarioId = DONO) => servico.prepararItens({ itens, usuarioId, chave: CHAVE })

test('nota e fotos chegam como metadados na peça certa; vazios permanecem omitidos', async () => {
  const { servico, chamadas } = simular()
  const itens = await preparar(servico, [...carrinho(), { id: PECA2, quantidade: 1, observacoes: ' ', imagensReferencia: [] }])
  assert.deepEqual(itens[1], { pecaId: PECA2, quantidade: 1 })
  assert.equal(itens[0].personalizacao, 'Nome: <Clara>\nAzul & rosa')
  assert.equal(itens[0].referencias[0].nome, FOTO.nome)
  assert.match(itens[0].referencias[0].caminho, new RegExp(`^${DONO}/${CHAVE}/${PECA}/[0-9a-f]{64}\\.png$`))
  assert.doesNotMatch(JSON.stringify(itens), /base64|data:image|previewUrl/)
  assert.equal(chamadas[0].blob.type, 'image/png')
  assert.deepEqual(chamadas[0].opcoes, { upsert: false, contentType: 'image/png' })
})

test('a mesma foto anexada duas vezes na peça gera uma única referência e um único upload', async () => {
  const { servico, chamadas } = simular()
  const [item] = await preparar(servico, carrinho({ imagensReferencia: [FOTO, { ...FOTO, nome: 'copia.png' }] }))
  assert.equal(item.referencias.length, 1)
  assert.equal(item.referencias[0].nome, FOTO.nome)
  assert.equal(chamadas.filter(c => c.tipo === 'upload').length, 1)
})

test('retry é determinístico e confirma conteúdo existente sem sobrescrever ou remover', async () => {
  const { servico, chamadas, objetos } = simular()
  const primeira = await preparar(servico)
  assert.deepEqual(await preparar(servico), primeira)
  assert.equal(objetos.size, 1)
  assert.deepEqual(chamadas.map(c => c.tipo), ['upload', 'upload', 'download'])
  assert.ok(chamadas.filter(c => c.tipo === 'upload').every(c => c.opcoes.upsert === false))
})

test('pipeline do checkout espera todos os uploads e não cria RPC se uma referência falhar', async () => {
  const dadosCheckout = { chave: CHAVE, endereco: { cep: '61940005' }, metodo: 'pix', totalExibidoCentavos: 1000 }
  const { servico, chamadas } = simular()
  const operacoes = []
  const operarCheckout = async (acao, dados) => {
    assert.equal(chamadas.length, 1)
    operacoes.push({ acao, dados })
    return { sessaoId: CHAVE }
  }
  assert.deepEqual(await prepararCheckoutComReferencias({ servicoReferencias: servico, operarCheckout, itens: carrinho(), usuarioId: DONO, ...dadosCheckout }), { sessaoId: CHAVE })
  assert.equal(operacoes[0].acao, 'preparar')
  assert.equal(operacoes[0].dados.itens[0].personalizacao, 'Nome: <Clara>\nAzul & rosa')
  assert.equal(operacoes[0].dados.metodo, 'pix')
  assert.deepEqual(operacoes[0].dados.endereco, dadosCheckout.endereco)
  assert.doesNotMatch(JSON.stringify(operacoes), /base64|usuarioId|servicoReferencias/)
  const falha = simular({ upload: async () => ({ error: { status: 503 } }) })
  await assert.rejects(prepararCheckoutComReferencias({ servicoReferencias: falha.servico, operarCheckout, itens: carrinho(), usuarioId: DONO, ...dadosCheckout }))
  assert.equal(operacoes.length, 1)
})

test('409 sem bytes iguais nunca finge que o upload foi salvo', async () => {
  for (const download of [async () => ({ data: new Blob(['outro conteúdo']) }), async () => ({ error: { status: 403 } })]) {
    const { servico } = simular({ upload: async () => ({ error: { statusCode: 409 } }), download })
    await assert.rejects(preparar(servico), /confirmar a foto/)
  }
})

test('falha e timeout preservam uploads já feitos e impedem resultado parcial', async () => {
  let envios = 0
  const { servico, chamadas } = simular({ upload: async () => ++envios === 1 ? { error: null } : { error: { status: 500 } } })
  await assert.rejects(preparar(servico, carrinho({ imagensReferencia: [FOTO, FOTO2] })), /enviar uma foto/)
  assert.equal(chamadas.length, 2)
  const lento = simular({ upload: () => new Promise(() => {}), timeoutMs: 5 })
  await assert.rejects(preparar(lento.servico), /demorou demais/)
  assert.equal(lento.chamadas.length, 1)
})

test('sem login, perfil diferente e troca de auth durante upload bloqueiam a preparação', async () => {
  for (const usuarios of [[null], [OUTRO], [DONO, OUTRO], [DONO, DONO, OUTRO]]) {
    const { servico, chamadas } = simular({ usuarios })
    await assert.rejects(preparar(servico), /sessão mudou/)
    assert.ok(chamadas.length <= (usuarios.length === 3 ? 1 : 0))
  }
  const { servico, chamadas } = simular()
  await assert.rejects(preparar(servico, carrinho(), OUTRO), /sessão mudou/)
  assert.equal(chamadas.length, 0)
})

test('anexos sem bytes, URLs, SVG, HTML, MIME e assinatura incoerentes são rejeitados antes de upload', async () => {
  const invalidas = [
    { nome: 'Antiga.png' }, { ...FOTO, dataUrl: '' }, { ...FOTO, dataUrl: 'https://example.com/foto.png' },
    { ...FOTO, dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
    { ...FOTO, dataUrl: 'data:text/html;base64,PGh0bWw+' },
    { ...FOTO, dataUrl: 'data:image/jpeg;base64,' + PNG },
    { ...FOTO, dataUrl: 'data:image/png;base64,%%%=' }, { ...FOTO, nome: 'x'.repeat(121) },
    { ...FOTO, dataUrl: 'data:image/png;base64,' + 'A'.repeat(466668) },
  ]
  for (const imagem of invalidas) {
    const { servico, chamadas } = simular()
    await assert.rejects(preparar(servico, carrinho({ imagensReferencia: [imagem] })), /reanexe/)
    assert.equal(chamadas.length, 0)
  }
  const invalida = simular({ decodificarImagem: async () => { throw new Error('Imagem truncada') } })
  await assert.rejects(preparar(invalida.servico), /reanexe/)
  assert.equal(invalida.chamadas.length, 0)
})

test('valida todos os itens e limites antes de enviar a primeira foto', async () => {
  for (const itens of [
    [...carrinho(), { id: PECA2, quantidade: 1, imagensReferencia: [{ nome: 'Antiga.png' }] }],
    carrinho({ observacoes: 'x'.repeat(1001) }), carrinho({ imagensReferencia: Array(7).fill(FOTO) }),
    carrinho({ id: '../outra-peca' }), carrinho({ quantidade: 51 }), Array(31).fill(carrinho()[0]),
  ]) {
    const { servico, chamadas } = simular()
    await assert.rejects(preparar(servico, itens))
    assert.equal(chamadas.length, 0)
  }
})

test('normalização do carrinho antigo conserva nome para bloquear anexo ausente no preparar', async () => {
  const itens = normalizarItens(carrinho({ precoCentavos: 1000, imagensReferencia: [{ nome: 'Foto antiga.png' }] }))
  assert.equal(itens[0].imagensReferencia[0].nome, 'Foto antiga.png')
  const { servico } = simular()
  await assert.rejects(preparar(servico, itens), /reanexe/)
})

test('assinatura usa bucket privado, lote e TTL900 e elimina quaisquer URLs dos metadados', async () => {
  const { servico, chamadas } = simular()
  const resultado = await servico.assinarReferencias([{ ...ref, url: 'https://evil.example', dataUrl: FOTO.dataUrl }])
  assert.deepEqual(chamadas[0], { tipo: 'assinar', paths: [ref.caminho], ttl: 900 })
  assert.equal(resultado[0].nome, ref.nome)
  assert.ok(resultado[0].url.startsWith(URL_PROJETO + '/storage/v1/object/sign/referencias-pedidos/'))
  assert.doesNotMatch(JSON.stringify(resultado), /evil|base64/)
})

test('assinatura recusa caminhos desconhecidos e respostas de URL arbitrária, pública ou de outro objeto', async () => {
  for (const path of ['https://evil.example/x.png', 'data:image/png;base64,AAA=', '../foto.png', ref.caminho.toUpperCase(), ref.caminho.replace('.png', '.svg'), ref.caminho.replace('/' + PECA + '/', '/../')]) {
    const { servico, chamadas } = simular()
    await assert.rejects(servico.assinarReferencias([{ ...ref, caminho: path }]))
    assert.equal(chamadas.length, 0)
  }
  for (const url of [
    'https://evil.example/storage/v1/object/sign/' + ref.caminho + '?token=x',
    URL_PROJETO + '/storage/v1/object/public/referencias-pedidos/' + ref.caminho,
    URL_PROJETO + '/storage/v1/object/sign/referencias-pedidos/' + caminho('b'.repeat(64)) + '?token=x',
    'data:image/png;base64,AAAA',
  ]) {
    const { servico } = simular({ assinar: async () => ({ data: [{ path: ref.caminho, signedUrl: url }] }) })
    await assert.rejects(servico.assinarReferencias([ref]), /segurança/)
  }
})

test('erros parciais e troca de sessão durante leitura não entregam URLs', async () => {
  for (const opcoes of [
    { assinar: async () => ({ data: [{ path: ref.caminho, error: 'Acesso negado' }] }) },
    { assinar: async () => ({ data: [], error: null }) },
    { usuarios: [DONO, OUTRO] },
  ]) {
    await assert.rejects(simular(opcoes).servico.assinarReferencias([ref]))
  }
})

test('DTOs legados e novos conservam texto separado, somente metadados e nome compacto', () => {
  const pedido = { id: CHAVE, numero_pedido: 1, criado_em: '2026-11-16T12:00:00Z', subtotal_centavos: 1000, frete_centavos: 0, total_centavos: 1000 }
  const item = { id: PECA, pedido_id: CHAVE, nome_peca_snapshot: 'Manta', quantidade: 1, preco_unitario_centavos: 1000, personalizacao: '<Azul & Rosa>\nNome Clara' }
  for (const referencias of [undefined, [ref]]) {
    const admin = mapearPedidoSupabase({ ...pedido, itens_pedido: [{ ...item, referencias }] })
    const cliente = mapearPedidoCliente(pedido, [{ ...item, referencias }], URL_PROJETO)
    assert.equal(admin.itens[0].personalizacao, item.personalizacao)
    assert.equal(cliente.itens[0].personalizacao, item.personalizacao)
    assert.deepEqual(admin.itens[0].referencias, referencias || [])
    assert.deepEqual(cliente.itens[0].referencias, referencias || [])
    assert.equal(admin.resumoItens, '1× Manta')
  }
  assert.deepEqual(normalizarReferenciasPedido([{ ...ref, url: 'https://evil.example', dataUrl: FOTO.dataUrl }]), [ref])
})

test('SDK real envia upsert false, PNG binário e autenticação ao endpoint privado sem rede', async () => {
  const requisicoes = []
  const cliente = createClient(URL_PROJETO, 'chave-publica-teste', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      requisicoes.push({ url: new URL(url), init })
      return new Response(JSON.stringify({ Key: 'teste', Id: PECA }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  cliente.auth.getUser = async () => ({ data: { user: { id: DONO } }, error: null })
  const servico = criarServicoReferenciasPedido({ cliente, crypto: webcrypto, decodificarImagem: async () => {} })
  await preparar(servico)
  assert.equal(requisicoes.length, 1)
  assert.match(requisicoes[0].url.pathname, /^\/storage\/v1\/object\/referencias-pedidos\//)
  const headers = new Headers(requisicoes[0].init.headers)
  assert.equal(headers.get('x-upsert'), 'false')
  assert.ok(headers.get('authorization'))
  assert.equal(requisicoes[0].init.method, 'POST')
})

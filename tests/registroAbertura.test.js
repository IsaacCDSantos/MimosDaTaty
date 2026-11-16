import test from 'node:test'
import assert from 'node:assert/strict'
import { criarRegistradorAbertura } from '../src/paginas/Catalogo/registrarAbertura.js'

const PECA = '20000000-0000-4000-8000-000000000001'
const OUTRA_PECA = '20000000-0000-4000-8000-000000000002'
const ABERTURA = '30000000-0000-4000-8000-000000000001'
const OUTRA_ABERTURA = '30000000-0000-4000-8000-000000000002'
const navegacao = { pecaId: PECA, navegacao: 'entrada-produto', habilitado: true }

test('efeitos concorrentes da mesma abertura compartilham uma requisição e o mesmo resultado', async () => {
  const chamadas = []
  let concluir
  const resposta = new Promise(resolve => { concluir = resolve })
  const registrar = criarRegistradorAbertura({
    gerarId: () => ABERTURA,
    registrar: (...args) => { chamadas.push(args); return resposta },
  })

  const primeira = registrar(navegacao)
  const repetida = registrar({ ...navegacao })
  assert.equal(primeira, repetida)
  await Promise.resolve()
  assert.deepEqual(chamadas, [[PECA, ABERTURA]])
  concluir(true)
  assert.equal(await primeira, true)
  assert.equal(await repetida, true)
})

test('re-renderização e remontagem da mesma navegação não registram outra abertura concluída', async () => {
  let chamadas = 0
  let ids = 0
  const registrar = criarRegistradorAbertura({
    gerarId: () => { ids += 1; return ABERTURA },
    registrar: async () => { chamadas += 1; return true },
  })

  assert.equal(await registrar(navegacao), true)
  assert.equal(await registrar({ ...navegacao }), true)
  assert.equal(await registrar({ ...navegacao, pecaId: PECA.toUpperCase() }), true)
  assert.equal(chamadas, 1)
  assert.equal(ids, 1)
})

test('abrir a mesma peça em uma nova navegação registra uma nova abertura', async () => {
  const ids = [ABERTURA, OUTRA_ABERTURA]
  const chamadas = []
  const registrar = criarRegistradorAbertura({
    gerarId: () => ids.shift(),
    registrar: async (...args) => { chamadas.push(args); return true },
  })

  await registrar(navegacao)
  await registrar({ ...navegacao, navegacao: 'nova-entrada-produto' })
  assert.deepEqual(chamadas, [[PECA, ABERTURA], [PECA, OUTRA_ABERTURA]])
})

test('peças diferentes não compartilham uma abertura mesmo com a mesma chave de rota', async () => {
  const ids = [ABERTURA, OUTRA_ABERTURA]
  const chamadas = []
  const registrar = criarRegistradorAbertura({
    gerarId: () => ids.shift(),
    registrar: async (...args) => { chamadas.push(args); return true },
  })

  await registrar(navegacao)
  await registrar({ ...navegacao, pecaId: OUTRA_PECA })
  assert.deepEqual(chamadas, [[PECA, ABERTURA], [OUTRA_PECA, OUTRA_ABERTURA]])
})

test('falha transitória tenta uma vez novamente reutilizando a ID, inclusive com efeitos repetidos', async () => {
  const chamadas = []
  let esperas = 0
  const registrar = criarRegistradorAbertura({
    gerarId: () => ABERTURA,
    aguardarNovaTentativa: async () => { esperas += 1 },
    registrar: async (...args) => {
      chamadas.push(args)
      if (chamadas.length === 1) throw new Error('Conexão interrompida após o envio')
      return true
    },
  })

  const primeira = registrar(navegacao)
  const repetida = registrar(navegacao)
  assert.equal(await primeira, true)
  assert.equal(await repetida, true)
  assert.deepEqual(chamadas, [[PECA, ABERTURA], [PECA, ABERTURA]])
  assert.equal(esperas, 1)
})

test('duas falhas de telemetria encerram silenciosamente sem novas tentativas no mesmo acesso', async () => {
  let chamadas = 0
  const registrar = criarRegistradorAbertura({
    gerarId: () => ABERTURA,
    aguardarNovaTentativa: async () => {},
    registrar: async () => { chamadas += 1; throw new Error('Sem conexão') },
  })

  assert.equal(await registrar(navegacao), false)
  assert.equal(await registrar({ ...navegacao }), false)
  assert.equal(chamadas, 2)
})

test('lista, dados de demonstração, carregamento e entradas inválidas não chamam o serviço', async () => {
  let chamadas = 0
  let ids = 0
  const registrar = criarRegistradorAbertura({
    gerarId: () => { ids += 1; return ABERTURA },
    registrar: async () => { chamadas += 1; return true },
  })

  for (const entrada of [
    undefined,
    { ...navegacao, habilitado: false },
    { ...navegacao, pecaId: null },
    { ...navegacao, pecaId: 1 },
    { ...navegacao, pecaId: 'kit-berco-florido' },
    { ...navegacao, navegacao: '' },
    { ...navegacao, navegacao: null },
  ]) assert.equal(await registrar(entrada), false)
  assert.equal(chamadas, 0)
  assert.equal(ids, 0)
})

test('resposta de abertura ignorada pelo servidor não é repetida', async () => {
  let chamadas = 0
  const registrar = criarRegistradorAbertura({
    gerarId: () => ABERTURA,
    registrar: async () => { chamadas += 1; return false },
  })

  assert.equal(await registrar(navegacao), false)
  assert.equal(await registrar(navegacao), false)
  assert.equal(chamadas, 1)
})

test('limite do cache preserva as aberturas pendentes e libera espaço após a conclusão', async () => {
  const chamadas = []
  const ids = [ABERTURA, OUTRA_ABERTURA]
  let concluir
  const resposta = new Promise(resolve => { concluir = resolve })
  const registrar = criarRegistradorAbertura({
    maximoAberturas: 1,
    gerarId: () => ids.shift(),
    registrar: (...args) => { chamadas.push(args); return resposta },
  })

  const primeira = registrar(navegacao)
  assert.equal(await registrar({ ...navegacao, navegacao: 'segunda-entrada' }), false)
  assert.equal(registrar(navegacao), primeira)
  concluir(true)
  await primeira
  assert.equal(await registrar({ ...navegacao, navegacao: 'segunda-entrada' }), true)
  assert.deepEqual(chamadas, [[PECA, ABERTURA], [PECA, OUTRA_ABERTURA]])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { solicitarRecuperacaoSenha } from '../src/servicos/recuperacaoSenha.js'

test('solicita recuperação real com e-mail normalizado e retorno para o ambiente atual', async () => {
  const chamadas = []
  const cliente = { auth: { resetPasswordForEmail: async (...args) => {
    chamadas.push(args)
    return { data: {}, error: null }
  } } }
  const inicio = Date.now()
  const resultado = await solicitarRecuperacaoSenha(cliente, {
    email: ' cliente@exemplo.com ', origem: 'http://localhost:5173', perfil: 'cliente',
  })
  assert.deepEqual(chamadas, [['cliente@exemplo.com', {
    redirectTo: 'http://localhost:5173/redefinir-senha',
  }]])
  assert.equal(resultado.email, 'cliente@exemplo.com')
  assert.ok(resultado.solicitadoEm >= inicio)
  assert.ok(resultado.solicitadoEm <= Date.now())
})

test('preserva o retorno administrativo e ignora valores de perfil diferentes de admin', async () => {
  const retornos = []
  const cliente = { auth: { resetPasswordForEmail: async (_email, options) => {
    retornos.push(options.redirectTo)
    return { error: null }
  } } }
  for (const perfil of ['admin', 'qualquer-outro-valor']) {
    await solicitarRecuperacaoSenha(cliente, { email: 'cliente@exemplo.com', origem: 'https://loja.exemplo.com', perfil })
  }
  assert.deepEqual(retornos, [
    'https://loja.exemplo.com/redefinir-senha?perfil=admin',
    'https://loja.exemplo.com/redefinir-senha',
  ])
})

test('não declara sucesso se a API bloquear o destinatário ou atingir o limite', async () => {
  for (const [code, mensagem] of [
    ['email_address_not_authorized', /não permite enviar/],
    ['over_email_send_rate_limit', /limite de envio/],
  ]) {
    const cliente = { auth: { resetPasswordForEmail: async () => ({
      error: { code, status: 429, message: 'Resposta privada com cliente@exemplo.com' },
    }) } }
    await assert.rejects(
      solicitarRecuperacaoSenha(cliente, { email: 'cliente@exemplo.com', origem: 'https://loja.exemplo.com' }),
      error => {
        assert.match(error.message, mensagem)
        assert.equal(error.code, code)
        assert.equal(error.status, 429)
        assert.doesNotMatch(error.message, /cliente@exemplo.com/)
        return true
      },
    )
  }
})

test('trata falha de rede lançada pelo cliente e limite sem código conhecido', async () => {
  for (const [falha, mensagem] of [
    [{ name: 'AuthRetryableFetchError', status: 0 }, /Verifique sua conexão/],
    [{ status: 429 }, /limite de solicitações/],
  ]) {
    const cliente = { auth: { resetPasswordForEmail: async () => { throw falha } } }
    await assert.rejects(
      solicitarRecuperacaoSenha(cliente, { email: 'cliente@exemplo.com', origem: 'https://loja.exemplo.com' }),
      mensagem,
    )
  }
})

test('não chama a API para endereço inválido e informa configuração ausente', async () => {
  let chamadas = 0
  const cliente = { auth: { resetPasswordForEmail: async () => { chamadas += 1 } } }
  await assert.rejects(
    solicitarRecuperacaoSenha(cliente, { email: 'inválido', origem: 'https://loja.exemplo.com' }),
    /e-mail válido/,
  )
  assert.equal(chamadas, 0)
  await assert.rejects(
    solicitarRecuperacaoSenha(null, { email: 'cliente@exemplo.com', origem: 'https://loja.exemplo.com' }),
    /indisponível/,
  )
})

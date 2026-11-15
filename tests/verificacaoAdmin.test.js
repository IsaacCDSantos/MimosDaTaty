import test from 'node:test'
import assert from 'node:assert/strict'
import { aguardarVerificacaoAdmin } from '../src/rotas/rotasPrivadas/verificacaoAdmin.js'

const sessaoAnterior = { user: { id: 'admin-a' }, access_token: 'anterior' }
const usuario = { id: 'admin-a', perfil: 'admin', autenticado: true }

test('aguarda a primeira verificação e uma sessão sem permissão confirmada', () => {
  assert.equal(aguardarVerificacaoAdmin(undefined, null), true)
  assert.equal(aguardarVerificacaoAdmin(sessaoAnterior, null), true)
})
test('renovar o token da mesma conta verificada não desmonta seu formulário', () => {
  const renovada = { user: { id: 'admin-a' }, access_token: 'renovado' }
  assert.equal(aguardarVerificacaoAdmin(renovada, { sessao: sessaoAnterior, usuario }), false)
})
test('trocar de conta exige nova verificação e não reutiliza o perfil anterior', () => {
  assert.equal(aguardarVerificacaoAdmin({ user: { id: 'cliente-b' } }, { sessao: sessaoAnterior, usuario }), true)
  assert.equal(aguardarVerificacaoAdmin({ user: {} }, { sessao: sessaoAnterior, usuario }), true)
})
test('resposta atual sem permissão permite à guarda redirecionar imediatamente', () => {
  assert.equal(aguardarVerificacaoAdmin(sessaoAnterior, { sessao: sessaoAnterior, usuario: null }), false)
  assert.equal(aguardarVerificacaoAdmin(null, { sessao: sessaoAnterior, usuario }), false)
})
test('uma conta sem perfil admin confirmado não mantém acesso durante revalidação', () => {
  assert.equal(aguardarVerificacaoAdmin({ user: { id: 'admin-a' } }, { sessao: sessaoAnterior, usuario: { ...usuario, perfil: 'cliente' } }), true)
})

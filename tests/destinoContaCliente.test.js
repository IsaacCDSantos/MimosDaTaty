import test from 'node:test'
import assert from 'node:assert/strict'
import { destinoAposLogin } from '../src/servicos/destinoLogin.js'

test('as duas páginas da conta retornam ao destino solicitado após autenticar', () => {
  for (const perfil of ['cliente', 'admin']) {
    assert.equal(destinoAposLogin(perfil, '/meu-perfil'), '/meu-perfil')
    assert.equal(destinoAposLogin(perfil, '/meus-pedidos'), '/meus-pedidos')
  }
})
test('os retornos de checkout, carrinho e início administrativo são preservados', () => {
  assert.equal(destinoAposLogin('cliente', '/checkout'), '/checkout')
  assert.equal(destinoAposLogin('cliente', '/carrinho'), '/carrinho')
  assert.equal(destinoAposLogin('admin', '/checkout'), '/admin')
  assert.equal(destinoAposLogin('admin'), '/admin')
})
test('retorno da conta não aceita caminhos externos, prefixos ou querystrings', () => {
  for (const origem of ['https://example.com/meus-pedidos', '//example.com/meus-pedidos', '/meus-pedidos/falso', '/meus-pedidos?redirect=externo', null, {}]) {
    assert.equal(destinoAposLogin('cliente', origem), '/')
  }
})

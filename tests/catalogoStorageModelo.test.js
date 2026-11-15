import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizarPeca } from '../src/paginas/Admin/CatalogoAdmin/catalogoModelo.js'

const projeto = 'https://catalogo-teste.supabase.co'
const foto = projeto + '/storage/v1/object/public/pecas/peca/foto.png'
const formulario = { nome: 'Manta para bebê', descricao: 'Manta artesanal de algodão.', preco: '129,90', categoria: 'Enxovais', prazo: '7 dias úteis', estoque: '3', imagem: foto, visivel: true }

test('aceita foto persistente somente no Storage do projeto configurado', () => {
  assert.equal(normalizarPeca(formulario, { urlSupabase: projeto }).imagem, foto)
  assert.throws(() => normalizarPeca(formulario), /foto|imagem/i)
})

test('rejeita URLs de outro projeto, bucket, esquema ou endereço temporário', () => {
  const invalidas = [foto.replace('catalogo-teste', 'outro-projeto'), foto.replace('/pecas/', '/outro-bucket/'), foto.replace('https:', 'http:'), foto + '?token=temporario', foto + '#fragmento', projeto + '/storage/v1/object/public/pecas/%2fexterna.png']
  for (const imagem of invalidas) assert.throws(() => normalizarPeca({ ...formulario, imagem }, { urlSupabase: projeto }), /foto|imagem/i)
})

test('preserva a disponibilidade escolhida e rejeita tipo desconhecido', () => {
  for (const tipoDisponibilidade of ['sob_encomenda', 'pronta_entrega']) assert.equal(normalizarPeca({ ...formulario, tipoDisponibilidade }, { urlSupabase: projeto }).tipoDisponibilidade, tipoDisponibilidade)
  assert.throws(() => normalizarPeca({ ...formulario, tipoDisponibilidade: 'qualquer' }, { urlSupabase: projeto }), /disponibilidade/i)
})

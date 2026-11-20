import test from 'node:test'
import assert from 'node:assert/strict'
import { otimizarImagemReferencia } from '../src/componentes/ReferenciasPedido/imagensCarrinho.js'

const JPEG = 'data:image/jpeg;base64,/9j/AAAA'
function ambiente({ largura = 2400, altura = 1600, exportar = () => JPEG, contexto = true, falhaDecode = false } = {}) {
  const exportacoes = [], desenhos = []
  const canvas = {
    width: 0, height: 0,
    getContext: () => contexto ? { fillRect() {}, drawImage(_img, _x, _y, w, h) { desenhos.push({ w, h }) } } : null,
    toDataURL(tipo, qualidade) {
      const chamada = { tipo, qualidade, width: canvas.width, height: canvas.height }
      exportacoes.push(chamada)
      return exportar(chamada)
    },
  }
  const imagem = { naturalWidth: largura, naturalHeight: altura,
    set src(url) { assert.equal(url, 'blob:original-local'); queueMicrotask(() => falhaDecode ? imagem.onerror() : imagem.onload()) },
  }
  return { exportacoes, desenhos, opcoes: { criarImagem: () => imagem, criarCanvas: () => canvas } }
}

test('otimização começa em 1280px, mantém proporção e usa JPEG de qualidade alta', async () => {
  const { opcoes, exportacoes, desenhos } = ambiente()
  assert.equal(await otimizarImagemReferencia('blob:original-local', opcoes), JPEG)
  assert.deepEqual(exportacoes, [{ tipo: 'image/jpeg', qualidade: 0.88, width: 1280, height: 853 }])
  assert.deepEqual(desenhos, [{ w: 1280, h: 853 }])
})

test('compressão adaptativa reduz qualidade e depois resolução para caber no carrinho', async () => {
  const grande = 'data:image/jpeg;base64,' + 'A'.repeat(350000)
  const { opcoes, exportacoes } = ambiente({ exportar: ({ width, qualidade }) => width <= 1024 && qualidade <= .78 ? JPEG : grande })
  const resultado = await otimizarImagemReferencia('blob:original-local', opcoes)
  assert.equal(resultado, JPEG)
  assert.ok(resultado.length <= 350000)
  assert.deepEqual(exportacoes.slice(0, 4).map(e => e.qualidade), [.88, .78, .66, .54])
  assert.equal(exportacoes.at(-1).width, 1024)
  assert.equal(exportacoes.at(-1).qualidade, .78)
})

test('imagem pequena não é ampliada e imagem vertical usa o maior lado', async () => {
  for (const [largura, altura, w, h] of [[320, 200, 320, 200], [1600, 2400, 853, 1280]]) {
    const { opcoes, desenhos } = ambiente({ largura, altura })
    await otimizarImagemReferencia('blob:original-local', opcoes)
    assert.deepEqual(desenhos[0], { w, h })
  }
})

test('falha de decode/canvas, formato inválido ou tamanho irredutível retornam falha sem falso anexo', async () => {
  for (const parametros of [
    { falhaDecode: true }, { contexto: false }, { largura: 0 }, { exportar: () => 'data:,' },
    { exportar: () => 'data:image/jpeg;base64,' + 'A'.repeat(350000) },
    { exportar: () => { throw new Error('Canvas indisponível') } },
  ]) {
    const { opcoes } = ambiente(parametros)
    assert.equal(await otimizarImagemReferencia('blob:original-local', opcoes), '')
  }
})

export const BUCKET_REFERENCIAS = 'referencias-pedidos'
const UUID_FONTE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const UUID = new RegExp(`^${UUID_FONTE}$`, 'i')
const CAMINHO = new RegExp(`^${UUID_FONTE}/${UUID_FONTE}/${UUID_FONTE}/[0-9a-f]{64}\\.(?:jpg|png|webp)$`)
const erro = mensagem => new Error(mensagem)
const falhaImagem = () => erro('Uma foto de referência não contém uma imagem válida. Volte ao catálogo e reanexe a foto antes de continuar.')

export async function prepararCheckoutComReferencias({ servicoReferencias, operarCheckout, itens, usuarioId, ...dados }) {
  const itensPreparados = await servicoReferencias.prepararItens({ itens, usuarioId, chave: dados.chave })
  return operarCheckout('preparar', { ...dados, itens: itensPreparados })
}

export function normalizarReferenciasPedido(valor) {
  if (valor == null) return []
  if (!Array.isArray(valor) || valor.length > 6) throw erro('As referências deste item são inválidas.')
  return valor.map(ref => {
    if (!ref || typeof ref.caminho !== 'string' || !CAMINHO.test(ref.caminho)
      || typeof ref.nome !== 'string' || !ref.nome.trim() || ref.nome.length > 120) throw erro('As referências deste item são inválidas.')
    return { caminho: ref.caminho, nome: ref.nome.trim() }
  })
}

async function decodificarNoNavegador(blob) {
  if (typeof globalThis.createImageBitmap === 'function') {
    const imagem = await globalThis.createImageBitmap(blob)
    try { if (!imagem.width || !imagem.height) throw falhaImagem() } finally { imagem.close() }
    return
  }
  const url = URL.createObjectURL(blob)
  try {
    await new Promise((resolve, reject) => {
      const imagem = new Image()
      imagem.onload = () => imagem.naturalWidth && imagem.naturalHeight ? resolve() : reject(falhaImagem())
      imagem.onerror = () => reject(falhaImagem())
      imagem.src = url
    })
  } finally { URL.revokeObjectURL(url) }
}

function imagemDoCarrinho(imagem) {
  if (!imagem?.dataUrl) throw falhaImagem()
  if (typeof imagem.nome !== 'string' || !imagem.nome.trim() || imagem.nome.length > 120) throw falhaImagem()
  const dados = typeof imagem.dataUrl === 'string' && imagem.dataUrl.length <= 466700
    ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(imagem.dataUrl) : null
  if (!dados || dados[2].length % 4 !== 0) throw falhaImagem()
  let bytes
  try { bytes = Uint8Array.from(atob(dados[2]), letra => letra.charCodeAt(0)) } catch { throw falhaImagem() }
  if (!bytes.length || bytes.length > 350000) throw falhaImagem()
  const inicia = assinatura => assinatura.every((valor, i) => bytes[i] === valor)
  const coerente = dados[1] === 'jpeg' ? inicia([255, 216, 255])
    : dados[1] === 'png' ? inicia([137, 80, 78, 71, 13, 10, 26, 10])
      : inicia([82, 73, 70, 70]) && [87, 69, 66, 80].every((valor, i) => bytes[i + 8] === valor)
  if (!coerente) throw falhaImagem()
  return { blob: new Blob([bytes], { type: `image/${dados[1]}` }), extensao: dados[1] === 'jpeg' ? 'jpg' : dados[1], nome: imagem.nome.trim() }
}

export function criarServicoReferenciasPedido({ cliente, crypto = globalThis.crypto, decodificarImagem = decodificarNoNavegador, timeoutMs = 30000 } = {}) {
  async function limitar(promessa) {
    let timer
    try {
      return await Promise.race([promessa, new Promise((_, reject) => { timer = setTimeout(() => reject(erro('O envio das referências demorou demais. Tente novamente; suas fotos continuam no carrinho.')), timeoutMs) })])
    } finally { clearTimeout(timer) }
  }
  async function conta(esperado) {
    if (!cliente?.auth?.getUser) throw erro('Entre na sua conta para enviar ou ver referências.')
    const resposta = await limitar(cliente.auth.getUser())
    const id = resposta?.data?.user?.id?.toLowerCase()
    if (resposta?.error || !UUID.test(id || '') || (esperado && id !== esperado)) throw erro('Sua sessão mudou. Entre novamente na sua conta antes de continuar.')
    return id
  }
  async function hash(blob) {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  }
  function bucket() {
    if (!cliente?.storage?.from) throw erro('O envio de referências está indisponível. Tente novamente.')
    return cliente.storage.from(BUCKET_REFERENCIAS)
  }
  return {
    async prepararItens({ itens, usuarioId, chave }) {
      if (typeof usuarioId !== 'string' || typeof chave !== 'string' || !UUID.test(usuarioId) || !UUID.test(chave)) throw erro('Entre na sua conta e inicie novamente a conferência do pedido.')
      const dono = usuarioId.toLowerCase()
      await conta(dono)
      if (!Array.isArray(itens) || !itens.length || itens.length > 30) throw erro('Confira as peças do carrinho.')
      // Valida todo o carrinho antes do primeiro upload; nunca aceita só o nome de uma foto antiga.
      const preparados = []
      for (const item of itens) {
        if (typeof item?.id !== 'string' || !UUID.test(item.id) || !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 50) throw erro('Confira as peças do carrinho.')
        if (item.observacoes != null && (typeof item.observacoes !== 'string' || item.observacoes.length > 1000)) throw erro('Os detalhes de cada peça devem ter até 1000 caracteres.')
        const imagens = item.imagensReferencia ?? []
        if (!Array.isArray(imagens) || imagens.length > 6) throw erro('Cada peça aceita até 6 fotos de referência.')
        const fotos = []
        for (const imagem of imagens) {
          const foto = imagemDoCarrinho(imagem)
          try { await limitar(decodificarImagem(foto.blob)) } catch { throw falhaImagem() }
          // O caminho deriva do conteúdo: a mesma foto anexada duas vezes vira uma só referência.
          const digest = await hash(foto.blob)
          if (!fotos.some(f => f.hash === digest)) fotos.push({ ...foto, hash: digest })
        }
        preparados.push({ pecaId: item.id.toLowerCase(), quantidade: item.quantidade, personalizacao: item.observacoes?.trim(), fotos })
      }
      const resultado = []
      for (const item of preparados) {
        const referencias = []
        for (const foto of item.fotos) {
          await conta(dono)
          const caminho = `${dono}/${chave.toLowerCase()}/${item.pecaId}/${foto.hash}.${foto.extensao}`
          const storage = bucket()
          const resposta = await limitar(storage.upload(caminho, foto.blob, { contentType: foto.blob.type, upsert: false }))
          if (resposta.error) {
            const conflito = String(resposta.error.statusCode ?? resposta.error.status) === '409' || resposta.error.code === 'Duplicate'
            if (!conflito) throw erro('Não foi possível enviar uma foto de referência. Tente novamente; suas fotos continuam no carrinho.')
            const existente = await limitar(storage.download(caminho))
            if (existente.error || !(existente.data instanceof Blob) || existente.data.size > 350000 || await hash(existente.data) !== foto.hash) throw erro('Não foi possível confirmar a foto já enviada. Tente novamente antes de continuar.')
          }
          referencias.push({ caminho, nome: foto.nome })
        }
        resultado.push({ pecaId: item.pecaId, quantidade: item.quantidade,
          ...(item.personalizacao ? { personalizacao: item.personalizacao } : {}), ...(referencias.length ? { referencias } : {}) })
      }
      await conta(dono)
      return resultado
    },
    async assinarReferencias(referencias) {
      const refs = normalizarReferenciasPedido(referencias)
      if (!refs.length) return []
      const dono = await conta()
      const caminhos = [...new Set(refs.map(ref => ref.caminho))]
      const { data, error } = await limitar(bucket().createSignedUrls(caminhos, 900))
      if (error || !Array.isArray(data)) throw erro('Não foi possível carregar as fotos de referência. Tente novamente.')
      const urls = new Map()
      for (const caminho of caminhos) {
        const row = data.find(item => item.path === caminho)
        try {
          const projeto = new URL(cliente.supabaseUrl)
          const url = new URL(row?.signedUrl)
          if (row.error || projeto.protocol !== 'https:' || url.protocol !== 'https:' || url.origin !== projeto.origin
            || url.username || url.password || url.hash || !url.searchParams.get('token')
            || url.pathname !== `/storage/v1/object/sign/${BUCKET_REFERENCIAS}/${caminho}`) throw erro('URL inválida')
          urls.set(caminho, url.href)
        } catch { throw erro('Não foi possível carregar as fotos de referência com segurança. Tente novamente.') }
      }
      await conta(dono)
      return refs.map(ref => ({ ...ref, url: urls.get(ref.caminho) }))
    },
  }
}

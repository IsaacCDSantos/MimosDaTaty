const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function criarRegistradorAbertura({
  registrar,
  gerarId = () => globalThis.crypto.randomUUID(),
  aguardarNovaTentativa = () => new Promise(resolve => setTimeout(resolve, 300)),
  maximoAberturas = 200,
} = {}) {
  // O cache dura apenas este documento. Reabrir por uma nova navegação gera
  // outra abertura; re-renderizar ou remontar a mesma navegação reutiliza a ID.
  const aberturas = new Map()
  const limite = Number.isSafeInteger(maximoAberturas) && maximoAberturas > 0 ? maximoAberturas : 200

  return function registrarAbertura({ pecaId, navegacao, habilitado = false } = {}) {
    if (!habilitado || typeof registrar !== 'function' || typeof pecaId !== 'string' || !UUID.test(pecaId)
      || typeof navegacao !== 'string' || !navegacao.trim()) {
      return Promise.resolve(false)
    }

    const identificador = pecaId.toLowerCase()
    const chave = JSON.stringify([navegacao, identificador])
    const anterior = aberturas.get(chave)
    if (anterior) return anterior.promessa

    if (aberturas.size >= limite) {
      const finalizada = [...aberturas].find(([, abertura]) => !abertura.pendente)
      if (!finalizada) return Promise.resolve(false)
      aberturas.delete(finalizada[0])
    }

    let aberturaId
    try { aberturaId = gerarId() } catch { return Promise.resolve(false) }
    if (typeof aberturaId !== 'string' || !UUID.test(aberturaId)) return Promise.resolve(false)

    const abertura = { pendente: true, promessa: null }
    aberturas.set(chave, abertura)
    abertura.promessa = Promise.resolve().then(async () => {
      for (let tentativa = 0; tentativa < 2; tentativa += 1) {
        try {
          return await registrar(identificador, aberturaId) === true
        } catch {
          if (tentativa === 0) {
            try { await aguardarNovaTentativa() } catch { return false }
          }
        }
      }
      return false
    }).finally(() => { abertura.pendente = false })
    return abertura.promessa
  }
}

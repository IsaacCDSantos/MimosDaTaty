export function supabaseSimulado(responder) {
  const chamadas = []
  function consulta(tabela, armazenamento = false) {
    const chamada = { tabela, armazenamento, filtros: [], ordenacao: [] }
    const api = {
      select(colunas, opcoes) { chamada.colunas = colunas; chamada.opcoes = opcoes; return api },
      insert(dados) { chamada.operacao = 'insert'; chamada.dados = dados; return api },
      update(dados) { chamada.operacao = 'update'; chamada.dados = dados; return api },
      eq(campo, valor) { chamada.filtros.push([campo, valor]); return api },
      neq(campo, valor) { chamada.filtros.push([campo, valor, 'neq']); return api },
      gt(campo, valor) { chamada.filtros.push([campo, valor, 'gt']); return api },
      in(campo, valores) { chamada.filtros.push([campo, valores, 'in']); return api },
      order(campo, opcoes) { chamada.ordenacao.push([campo, opcoes]); return api },
      limit(valor) { chamada.limite = valor; return api },
      range(inicio, fim) { chamada.intervalo = [inicio, fim]; return api },
      abortSignal(signal) { chamada.signal = signal; return api },
      maybeSingle() { chamada.unico = true; return api },
      single() { chamada.unico = true; return api },
      upload(caminho, arquivo) { chamada.operacao = 'upload'; chamada.caminho = caminho; chamada.arquivo = arquivo; return api },
      remove(caminhos) { chamada.operacao = 'remove'; chamada.caminhos = caminhos; return api },
      getPublicUrl(caminho) { return { data: { publicUrl: `https://example.test/${caminho}` } } },
      then(resolve, reject) {
        chamadas.push(chamada)
        return Promise.resolve().then(() => responder(chamada, chamadas)).then(resolve, reject)
      },
    }
    return api
  }
  return { chamadas, from: tabela => consulta(tabela), storage: { from: tabela => consulta(tabela, true) } }
}

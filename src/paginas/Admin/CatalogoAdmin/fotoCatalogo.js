export function lerFotoDaPeca(arquivo, { permitirGif = true } = {}) {
  if (!arquivo || !['image/png', 'image/jpeg', 'image/webp', 'image/avif', ...(permitirGif ? ['image/gif'] : [])].includes(arquivo.type)) return Promise.reject(new Error('Selecione uma imagem PNG, JPEG, WebP ou AVIF.'))
  if (arquivo.size > 5 * 1024 * 1024) return Promise.reject(new Error('A foto deve ter no máximo 5 MB.'))
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('Não foi possível ler a foto. Tente outro arquivo.'))
    leitor.onload = () => {
      const imagem = new Image()
      imagem.onload = () => resolve(leitor.result)
      imagem.onerror = () => reject(new Error('O arquivo não contém uma imagem válida.'))
      imagem.src = leitor.result
    }
    leitor.readAsDataURL(arquivo)
  })
}

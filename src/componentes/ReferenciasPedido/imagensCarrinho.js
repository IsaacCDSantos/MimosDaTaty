// Mantém o original no preview local; só a versão otimizada segue para o carrinho.
export function otimizarImagemReferencia(previewUrl, {
  criarImagem = () => new Image(), criarCanvas = () => document.createElement('canvas'),
} = {}) {
  return new Promise(resolve => {
    const img = criarImagem()
    img.onload = () => {
      try {
        if (!img.naturalWidth || !img.naturalHeight) { resolve(''); return }
        const canvas = criarCanvas()
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(''); return }
        for (const largura of [1280, 1024, 800, 640, 480, 360]) {
          const escala = Math.min(1, largura / Math.max(img.naturalWidth, img.naturalHeight))
          canvas.width = Math.max(1, Math.round(img.naturalWidth * escala))
          canvas.height = Math.max(1, Math.round(img.naturalHeight * escala))
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          for (const qualidade of [0.88, 0.78, 0.66, 0.54]) {
            const dataUrl = canvas.toDataURL('image/jpeg', qualidade)
            if (/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl) && dataUrl.length <= 350000) {
              resolve(dataUrl)
              return
            }
          }
        }
        resolve('')
      } catch { resolve('') }
    }
    img.onerror = () => resolve('')
    img.src = previewUrl
  })
}

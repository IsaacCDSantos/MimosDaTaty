import { useEffect, useState } from 'react';

const cacheMiniaturas = new Map();

function reduzirProgressivamente(imagem, larguraAlvo) {
  const larguraOrig = imagem.naturalWidth || imagem.width;
  const alturaOrig = imagem.naturalHeight || imagem.height;

  if (!larguraOrig || !alturaOrig || larguraOrig <= larguraAlvo * 1.35) {
    return null;
  }

  let larguraAtual = larguraOrig;
  let alturaAtual = alturaOrig;
  let fonteAtual = imagem;

  // Reduz no máximo pela metade por etapa (progressive downsampling)
  // para preservar detalhes finos como bordados e texturas sem borrar.
  while (larguraAtual * 0.5 >= larguraAlvo) {
    const proxLargura = Math.round(larguraAtual * 0.5);
    const proxAltura = Math.round(alturaAtual * 0.5);
    const passoCanvas = document.createElement('canvas');
    passoCanvas.width = proxLargura;
    passoCanvas.height = proxAltura;

    const passoCtx = passoCanvas.getContext('2d');
    if (!passoCtx) return null;
    passoCtx.imageSmoothingEnabled = true;
    passoCtx.imageSmoothingQuality = 'high';
    passoCtx.drawImage(fonteAtual, 0, 0, proxLargura, proxAltura);

    fonteAtual = passoCanvas;
    larguraAtual = proxLargura;
    alturaAtual = proxAltura;
  }

  const escalaFinal = larguraAlvo / larguraAtual;
  const finalLargura = Math.round(larguraAtual * escalaFinal);
  const finalAltura = Math.round(alturaAtual * escalaFinal);

  const canvasFinal = document.createElement('canvas');
  canvasFinal.width = finalLargura;
  canvasFinal.height = finalAltura;
  const ctxFinal = canvasFinal.getContext('2d');
  if (!ctxFinal) return null;

  ctxFinal.imageSmoothingEnabled = true;
  ctxFinal.imageSmoothingQuality = 'high';
  ctxFinal.drawImage(fonteAtual, 0, 0, finalLargura, finalAltura);

  return canvasFinal;
}

function gerarUrlMiniatura(src, larguraAlvo) {
  const chave = `${src}::${larguraAlvo}`;
  if (cacheMiniaturas.has(chave)) {
    return cacheMiniaturas.get(chave);
  }

  const promessa = new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      resolve(src);
      return;
    }

    const img = new Image();
    if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const canvasFinal = reduzirProgressivamente(img, larguraAlvo);
        if (!canvasFinal) {
          resolve(src);
          return;
        }
        canvasFinal.toBlob((blob) => {
          resolve(blob ? URL.createObjectURL(blob) : src);
        }, 'image/png');
      } catch {
        resolve(src);
      }
    };

    img.onerror = () => resolve(src);
    img.src = src;
  });

  cacheMiniaturas.set(chave, promessa);
  return promessa;
}

/**
 * Renderiza imagem de produto com redução progressiva em alta qualidade
 * para evitar aspecto borrado ou serrilhado em miniaturas de catálogo e carrinho.
 */
export default function MiniaturaProduto({
  src,
  alt,
  className,
  larguraAlvo = 360,
}) {
  const [otimizada, setOtimizada] = useState({ origem: src, url: src });
  const [carregadaPara, setCarregadaPara] = useState('');

  useEffect(() => {
    if (!src) return undefined;
    let ativo = true;

    gerarUrlMiniatura(src, larguraAlvo).then((urlResultado) => {
      if (ativo && urlResultado) {
        setOtimizada({ origem: src, url: urlResultado });
      }
    });

    return () => {
      ativo = false;
    };
  }, [src, larguraAlvo]);

  const srcExibido = otimizada.origem === src ? otimizada.url : src;
  const pronta = carregadaPara === src || carregadaPara === srcExibido;

  return (
    <img
      src={srcExibido}
      alt={alt}
      className={`${className || ''} ${pronta ? 'miniaturaPronta' : ''}`.trim()}
      decoding="async"
      onLoad={() => setCarregadaPara(srcExibido)}
    />
  );
}

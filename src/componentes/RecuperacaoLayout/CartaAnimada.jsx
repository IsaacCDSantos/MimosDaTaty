import { useEffect, useId, useRef } from 'react'
import './CartaAnimada.css'

// Todas as partes têm movimento próprio; a carta e a sombra compartilham o ciclo.
const movimentos = [
  ['carta', [
    { transform: 'translate(-3px, 7px) rotate(-3deg)' },
    { transform: 'translate(4px, -20px) rotate(2.5deg)' },
    { transform: 'translate(-3px, 7px) rotate(-3deg)' },
  ], 5200, -900],
  ['sombra', [
    { transform: 'scaleX(1.08)', opacity: .7 },
    { transform: 'scaleX(.75)', opacity: .28 },
    { transform: 'scaleX(1.08)', opacity: .7 },
  ], 5200, -900],
  ['halo', [
    { transform: 'scale(.98)', opacity: .85 },
    { transform: 'scale(1.07)', opacity: 1 },
    { transform: 'scale(.98)', opacity: .85 },
  ], 7600, -1400],
  ['fio', [
    { transform: 'translate(-1px, 3px) rotate(-4deg)' },
    { transform: 'translate(3px, -3px) rotate(4deg)' },
    { transform: 'translate(-1px, 3px) rotate(-4deg)' },
  ], 6800, -1800],
  ['coracao', [
    { transform: 'scale(1)' },
    { transform: 'scale(1.12)' },
    { transform: 'scale(1)' },
  ], 2600, -900],
  ['brilho-maior', [
    { transform: 'translate(0, 3px) rotate(-12deg) scale(.7)', opacity: .35 },
    { transform: 'translate(0, -5px) rotate(30deg) scale(1.22)', opacity: 1 },
    { transform: 'translate(0, 3px) rotate(-12deg) scale(.7)', opacity: .35 },
  ], 4200, -450],
  ['brilho-menor', [
    { transform: 'translate(2px, 2px) rotate(12deg) scale(.8)', opacity: .45 },
    { transform: 'translate(-4px, -4px) rotate(-20deg) scale(1.2)', opacity: 1 },
    { transform: 'translate(2px, 2px) rotate(12deg) scale(.8)', opacity: .45 },
  ], 5300, -2000],
  ['ponto-rosa', [
    { transform: 'translate(-6px, 2px) scale(.85)' },
    { transform: 'translate(5px, -7px) scale(1.15)' },
    { transform: 'translate(-6px, 2px) scale(.85)' },
  ], 4800, -700],
  ['ponto-pessego', [
    { transform: 'translate(-5px, 4px)', opacity: .6 },
    { transform: 'translate(8px, -10px)', opacity: 1 },
    { transform: 'translate(-5px, 4px)', opacity: .6 },
  ], 6200, -1500],
]

export default function CartaAnimada() {
  const svg = useRef(null)
  const sombraId = useId()

  useEffect(() => {
    const players = movimentos.map(([nome, quadros, duration, delay]) => (
      svg.current.querySelector('[data-movimento="' + nome + '"]').animate(quadros, {
        duration, delay, iterations: Infinity, easing: 'ease-in-out',
      })
    ))
    return () => {
      players.forEach(player => player.cancel())
    }
  }, [])

  return (
    <>
      <div className="senha-ilustracao" aria-hidden="true">
        <svg ref={svg} className="senha-ilustracao-canvas" width="330" height="250" viewBox="0 0 330 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={sombraId}>
              <stop stopColor="#8c5846" stopOpacity=".24" />
              <stop offset="1" stopColor="#8c5846" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="senha-carta-halo" data-movimento="halo">
            <circle cx="165" cy="120" r="105" fill="#fdf4eb" />
          </g>
          <g className="senha-carta-fio" data-movimento="fio">
            <path d="M34 200C34.6192 199.407 35.222 198.814 35.8087 198.224M55.0579 118.223C54.9797 119.048 54.9247 119.882 54.8896 120.724M55.0579 118.223C55.1359 117.402 55.2368 116.589 55.3643 115.785M55.0579 118.223C55.2855 119.082 55.5621 119.92 55.8846 120.735M55.0579 118.223C54.8745 117.531 54.7229 116.825 54.6047 116.108M142 132C142.036 131.164 142.057 130.333 142.061 129.506M39.9028 193.832C41.0399 192.527 42.102 191.23 43.0937 189.94M46.5592 185.031C47.4942 183.58 48.3452 182.138 49.1189 180.705M51.7161 175.275C52.3769 173.694 52.9511 172.125 53.4485 170.57M54.9827 164.748C55.3317 163.082 55.6032 161.433 55.8099 159.8M56.305 153.799C56.3749 152.106 56.3894 150.434 56.3637 148.781M56.1147 142.766C56.0077 141.073 55.8769 139.404 55.7404 137.759M55.2406 131.755C55.1087 130.057 54.9957 128.388 54.9238 126.748M56.8125 110.079C57.3632 108.564 58.052 107.084 58.9056 105.642M62.4359 100.934C63.492 99.7936 64.6857 98.6804 66.0329 97.5949M70.869 94.2276C71.5512 93.8138 72.2612 93.4046 73 93C73.7706 92.6004 74.5444 92.2384 75.3198 91.9124M81.1835 90.1158C82.8969 89.7781 84.5969 89.6019 86.2651 89.5726M92.3682 90.1298C94.0711 90.4763 95.7083 90.9765 97.2554 91.6116M102.607 94.6015C104.01 95.6332 105.269 96.7978 106.353 98.0707M109.531 103.293C110.158 104.873 110.549 106.538 110.666 108.261M109.952 114.32C109.484 115.858 108.79 117.414 107.847 118.971M104.072 123.81C102.965 124.957 101.708 126.094 100.29 127.214M95.2438 130.699C94.5243 131.137 93.7766 131.571 93 132C92.207 132.427 91.4131 132.815 90.6196 133.165M84.5938 135.124C82.8174 135.501 81.0626 135.698 79.3466 135.731M73.046 135.095C71.2982 134.7 69.6232 134.129 68.0435 133.401M62.6811 130.034C61.3162 128.905 60.0847 127.632 59.0122 126.237M54.342 110.932C54.4254 109.533 54.6327 108.105 54.9736 106.656M56.6267 101.741C57.1844 100.468 57.8481 99.1876 58.624 97.9036M61.6049 93.6549C62.0478 93.1027 62.5127 92.5509 63 92C63.5593 91.3585 64.1221 90.7364 64.6881 90.1336M68.9582 85.9965C70.2359 84.8759 71.526 83.8453 72.8256 82.9018M77.8709 79.6935C79.3572 78.8774 80.8507 78.1675 82.3472 77.5596M88.0202 75.7378C89.655 75.3486 91.2871 75.0752 92.9109 74.9123M98.8672 74.8036C100.526 74.9092 102.168 75.1273 103.788 75.452M109.521 77.0746C111.067 77.6434 112.585 78.3104 114.066 79.0699M119.171 82.1477C120.517 83.0877 121.823 84.1081 123.083 85.2037M127.338 89.3795C128.439 90.5957 129.492 91.8756 130.492 93.2147M133.795 98.1792C134.629 99.5916 135.409 101.053 136.131 102.561M138.431 108.066C138.986 109.608 139.483 111.187 139.918 112.801M141.188 118.626C141.46 120.245 141.671 121.89 141.817 123.56" strokeWidth="2.2" stroke="#D99294"/>
          </g>
          <g className="senha-carta-sombra" data-movimento="sombra">
            <ellipse cx="182" cy="207" rx="66" ry="10" fill={'url(#' + sombraId + ')'} />
          </g>
          <g className="senha-carta" data-movimento="carta">
            <path d="M246 62H118C108.059 62 100 70.0589 100 80V170C100 179.941 108.059 188 118 188H246C255.941 188 264 179.941 264 170V80C264 70.0589 255.941 62 246 62Z" fill="white" strokeWidth="2" stroke="#d99294" />
            <path d="M107 72L181 131L257 72M107 177L158 132M257 177L205 132" strokeWidth="2" stroke="#d99294" />
            <g className="senha-carta-coracao" data-movimento="coracao">
              <path d="M182 147C176 142 163 133 163 123C163 112 177 110 182 119C188 110 202 112 202 123C202 133 189 142 182 147Z" fill="#d99294" />
            </g>
          </g>
          <g className="senha-carta-brilho-maior" data-movimento="brilho-maior">
            <path d="M259 38v20m-10-10h20" stroke="#a95965" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g className="senha-carta-brilho-menor" data-movimento="brilho-menor">
            <path d="M81 178v16m-8-8h16" stroke="#a95965" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g className="senha-carta-ponto-rosa" data-movimento="ponto-rosa">
            <circle cx="82" cy="49" r="4" fill="#d99294" />
          </g>
          <g className="senha-carta-ponto-pessego" data-movimento="ponto-pessego">
            <circle cx="285" cy="150" r="5" fill="#e9c9b6" />
          </g>
        </svg>
      </div>
    </>
  )
}

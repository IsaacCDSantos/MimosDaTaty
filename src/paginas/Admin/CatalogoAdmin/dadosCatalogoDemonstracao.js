import kitBerco from '../../../assets/imagens/kit_berco_florido_figma.png'
import mantaCroche from '../../../assets/imagens/manta_croche_bebe_figma.png'
import trocadorCroche from '../../../assets/imagens/trocador_croche_figma.png'

// Peças de exemplo para a prévia. Não representam estoque ou disponibilidade reais.
export const PECAS_DEMONSTRACAO = [
  {
    id: 1,
    nome: 'Kit de berço florido',
    descricao: 'Conjunto com manta, toalha e trocador em crochê com acabamento delicado.',
    preco: 189,
    categoria: 'Maternidade',
    prazo: '7 dias úteis',
    estoque: 3,
    imagem: kitBerco,
    visivel: true,
  },
  {
    id: 2,
    nome: 'Manta de crochê bebê',
    descricao: 'Peça macia e leve para complementar o enxoval com um toque especial.',
    preco: 129,
    categoria: 'Enxovais',
    prazo: '7 dias úteis',
    estoque: 5,
    imagem: mantaCroche,
    visivel: true,
  },
  {
    id: 3,
    nome: 'Trocador de crochê',
    descricao: 'Peça prática e decorativa para o banho e o cuidado diário do bebê.',
    preco: 89,
    categoria: 'Crochê & Bordado',
    prazo: '7 dias úteis',
    estoque: 4,
    imagem: trocadorCroche,
    visivel: true,
  },
]

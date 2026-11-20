import kitBercoImg from '../../assets/imagens/kit_berco_florido_figma.png';
import mantaCrocheImg from '../../assets/imagens/manta_croche_bebe_figma.png';
import trocadorCrocheImg from '../../assets/imagens/trocador_croche_figma.png';

export const CATEGORIAS_CATALOGO = [
  'Maternidade',
  'Enxovais',
  'Crochê & Bordado',
];

export const PRODUTOS_INICIAIS = [
  {
    id: 1,
    nome: 'Kit de berço florido',
    categoria: 'Enxovais',
    preco: 189.0,
    prazo: 'Entrega em até 7 dias úteis',
    descricao:
      'Conjunto com manta, toalha e trocador em crochê com acabamento delicado.',
    detalhes:
      'Confeccionado artesanalmente ponto a ponto com fios 100% algodão hipoalergênicos, ideal para trazer aconchego e delicadeza ao quarto do bebê.',
    imagem: kitBercoImg,
    quantidade: 1,
  },
  {
    id: 2,
    nome: 'Manta de crochê bebê',
    categoria: 'Crochê & Bordado',
    preco: 129.0,
    prazo: 'Entrega em até 7 dias úteis',
    descricao:
      'Peça macia e leve para complementar o enxoval com um toque especial.',
    detalhes:
      'Trama respirável e toque extremamente suave para proteger o recém-nascido em todas as estações, com possibilidade de personalização de cores e barrado.',
    imagem: mantaCrocheImg,
    quantidade: 1,
  },
  {
    id: 3,
    nome: 'Trocador de crochê',
    categoria: 'Maternidade',
    preco: 89.0,
    prazo: 'Entrega em até 7 dias úteis',
    descricao:
      'Peça prática e decorativa para o banho e o cuidado diário do bebê.',
    detalhes:
      'Estruturado com espuma confortável, capa removível para facilitar a higienização e acabamento em crochê feito à mão na paleta que combinar com o quartinho.',
    imagem: trocadorCrocheImg,
    quantidade: 1,
  },
];

// Fica em um m\u00f3dulo sem imagens para o build tamb\u00e9m gerar o sitemap.xml com ele.
export { slugDaPeca } from '../../servicos/slug.js';

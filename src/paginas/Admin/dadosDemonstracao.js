import kitBerco from '../../assets/imagens/kit_berco_florido_figma.png'
import mantaCroche from '../../assets/imagens/manta_croche_bebe_figma.png'
import trocadorCroche from '../../assets/imagens/trocador_croche_figma.png'

// Dados fictícios da referência visual; não representam o estoque da loja.
export const DADOS_ADMIN_DEMONSTRACAO = {
  administradora: 'Tati',
  resumo: { total: 24, visiveis: 22, ocultas: 2 },
  categorias: ['Maternidade', 'Enxovais', 'Crochê & Bordado', 'Presentes'],
  destaques: [
    { id: 'kit-berco-florido', nome: 'Kit de berço florido', descricao: 'Conjunto com manta, toalha e trocador', preco: 189, imagem: kitBerco, categoria: 'Enxovais', prazo: 'Até 7 dias úteis', visivel: true },
    { id: 'manta-croche-bebe', nome: 'Manta de crochê bebê', descricao: 'Peça macia e leve em linha antialérgica', preco: 129, imagem: mantaCroche, categoria: 'Crochê & Bordado', prazo: 'Até 7 dias úteis', visivel: true },
    { id: 'trocador-croche', nome: 'Trocador de crochê', descricao: 'Acabamento delicado para o cuidado diário', preco: 89, imagem: trocadorCroche, categoria: 'Maternidade', prazo: 'Até 7 dias úteis', visivel: true },
  ],
}

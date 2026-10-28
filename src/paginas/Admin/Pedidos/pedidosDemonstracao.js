import kitBerco from '../../../assets/imagens/kit_berco_florido_figma.png'
import mantaCroche from '../../../assets/imagens/manta_croche_bebe_figma.png'
import trocadorCroche from '../../../assets/imagens/trocador_croche_figma.png'

// Todos os pedidos, nomes, contatos, endereços e rastreios são FICTÍCIOS.
// Estes exemplos não representam clientes, encomendas ou pagamentos da loja.
const pecas = {
  kit: { id: 'kit-berco', nome: 'Kit de berço florido', precoUnitario: 189, imagem: kitBerco },
  manta: { id: 'manta-croche', nome: 'Manta de crochê bebê', precoUnitario: 129, imagem: mantaCroche },
  trocador: { id: 'trocador-croche', nome: 'Trocador de crochê', precoUnitario: 89, imagem: trocadorCroche },
  toalha: { id: 'toalha-bordada', nome: 'Toalha bordada', precoUnitario: 73 },
  saquinho: { id: 'saquinho-personalizado', nome: 'Saquinho personalizado', precoUnitario: 47 },
}

function item(peca, quantidade = 1) {
  return { ...pecas[peca], quantidade }
}

function criarPedido({
  id,
  data,
  nome,
  status,
  itens,
  frete = 25,
  desconto = 0,
  formaPagamento = 'Pix',
  observacaoCliente = '',
  observacaoInterna = '',
}) {
  return {
    id,
    data,
    cliente: {
      nome,
      email: 'cliente' + id + '@example.com',
      telefone: '(00) 00000-0000',
    },
    endereco: {
      logradouro: 'Rua Exemplo',
      numero: '100',
      complemento: 'Casa de demonstração',
      bairro: 'Bairro Exemplo',
      cidade: 'Cidade Exemplo',
      uf: 'SP',
      cep: '00000-000',
    },
    itens,
    resumoItens: itens.map(peca => (peca.quantidade > 1 ? peca.quantidade + ' × ' : '') + peca.nome).join(' + '),
    frete,
    desconto,
    formaPagamento,
    observacaoCliente,
    observacaoInterna,
    codigoRastreio: status === 'enviado' || status === 'entregue' ? 'EXEMPLO-' + id : '',
    status,
  }
}

// A ordem preserva as seis linhas da referência na primeira página.
// Contagens globais: 6 novos, 4 em produção, 3 enviados e 3 entregues.
export const PEDIDOS_DEMONSTRACAO = [
  criarPedido({
    id: 1042,
    data: '2026-09-29',
    nome: 'Mariana Souza',
    status: 'novo',
    itens: [item('kit', 2)],
    frete: 54,
    observacaoCliente: 'Gostaria dos detalhes em rosa e branco.',
  }),
  criarPedido({
    id: 1041,
    data: '2026-09-28',
    nome: 'Camila Andrade',
    status: 'em_producao',
    itens: [item('manta')],
    formaPagamento: 'Cartão de crédito',
    observacaoCliente: 'Preferência por acabamento em tons de verde-claro.',
    observacaoInterna: 'Conferir o acabamento da manta antes de embalar.',
  }),
  criarPedido({
    id: 1040,
    data: '2026-09-26',
    nome: 'Renata Lima',
    status: 'enviado',
    itens: [item('trocador')],
    observacaoCliente: 'É para presente. Usar uma embalagem delicada.',
    observacaoInterna: 'Pedido fictício embalado. Rastreio apenas demonstrativo.',
  }),
  criarPedido({
    id: 1039,
    data: '2026-09-22',
    nome: 'Juliana Prado',
    status: 'entregue',
    itens: [item('kit', 2), item('manta')],
    frete: 54,
    formaPagamento: 'Cartão de crédito',
    observacaoCliente: 'Combinar as cores da manta com as do kit.',
  }),
  criarPedido({
    id: 1038,
    data: '2026-09-20',
    nome: 'Fernanda Costa',
    status: 'entregue',
    itens: [item('toalha')],
  }),
  criarPedido({
    id: 1037,
    data: '2026-09-18',
    nome: 'Patrícia Rocha',
    status: 'entregue',
    itens: [item('saquinho')],
    formaPagamento: 'Cartão de débito',
  }),
  criarPedido({
    id: 1036,
    data: '2026-09-17',
    nome: 'Ana Paula Ferreira',
    status: 'novo',
    itens: [item('kit')],
    observacaoCliente: 'Manter os detalhes em cores suaves.',
  }),
  criarPedido({
    id: 1035,
    data: '2026-09-16',
    nome: 'Beatriz Martins',
    status: 'novo',
    itens: [item('manta', 2)],
    formaPagamento: 'Cartão de crédito',
  }),
  criarPedido({
    id: 1034,
    data: '2026-09-15',
    nome: 'Larissa Alves',
    status: 'em_producao',
    itens: [item('trocador', 2)],
    frete: 30,
    observacaoInterna: 'Revisar as duas peças juntas antes da embalagem.',
  }),
  criarPedido({
    id: 1033,
    data: '2026-09-14',
    nome: 'Aline Ribeiro',
    status: 'enviado',
    itens: [item('kit'), item('manta')],
    frete: 35,
    desconto: 10,
    observacaoInterna: 'Rastreio de demonstração; não consultar transportadoras.',
  }),
  criarPedido({
    id: 1032,
    data: '2026-09-13',
    nome: 'Carolina Mendes',
    status: 'novo',
    itens: [item('toalha', 2)],
  }),
  criarPedido({
    id: 1031,
    data: '2026-09-12',
    nome: 'Gabriela Nunes',
    status: 'em_producao',
    itens: [item('saquinho', 3)],
    observacaoInterna: 'Conferir a quantidade antes de concluir a produção.',
  }),
  criarPedido({
    id: 1030,
    data: '2026-09-11',
    nome: 'Letícia Gomes',
    status: 'novo',
    itens: [item('kit')],
    formaPagamento: 'Cartão de crédito',
  }),
  criarPedido({
    id: 1029,
    data: '2026-09-10',
    nome: 'Daniela Moreira',
    status: 'enviado',
    itens: [item('manta')],
  }),
  criarPedido({
    id: 1028,
    data: '2026-09-09',
    nome: 'Bruna Carvalho',
    status: 'em_producao',
    itens: [item('kit'), item('trocador')],
    frete: 35,
    formaPagamento: 'Cartão de crédito',
  }),
  criarPedido({
    id: 1027,
    data: '2026-09-08',
    nome: 'Isabela Teixeira',
    status: 'novo',
    itens: [item('saquinho', 2)],
  }),
]

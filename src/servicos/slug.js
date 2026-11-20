export function slugDaPeca(produto) {
  const base = String(produto?.nome || 'peca')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base || 'peca'}-${produto?.id}`;
}

// Mantém o formulário da mesma conta durante a revalidação de um token renovado.
// Troca de conta ou ausência de sessão nunca reutilizam a permissão anterior.
export function aguardarVerificacaoAdmin(sessao, verificacao) {
  if (sessao === undefined) return true
  if (!sessao || verificacao?.sessao === sessao) return false
  const usuario = verificacao?.usuario
  const mesmaContaAdministradora = usuario?.autenticado === true && usuario.perfil === 'admin'
    && Boolean(usuario.id) && usuario.id === sessao.user?.id
  return !mesmaContaAdministradora
}

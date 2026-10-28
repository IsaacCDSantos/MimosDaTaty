import { supabase } from './supabase'

export async function encerrarSessao() {
  if (!supabase) throw new Error('Autenticação indisponível.')
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw error
}

export async function obterUsuarioAtual() {
  if (!supabase) return null
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  const { data: dadosPerfil, error: erroPerfil } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (erroPerfil || !dadosPerfil) {
    return null
  }

  return {
    id: user.id,
    autenticado: true,
    perfil: dadosPerfil.perfil,
  }
}

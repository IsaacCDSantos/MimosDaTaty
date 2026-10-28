import { supabase } from './supabase'

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

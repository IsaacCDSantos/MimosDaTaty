import { supabase } from './supabase'
import { criarServicoPerfil } from './perfilModelo'

export const servicoPerfil = criarServicoPerfil(supabase)

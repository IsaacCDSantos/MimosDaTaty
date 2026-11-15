import { supabase, SUPABASE_URL } from './supabase'
import { criarServicoPecas } from './pecas'

export const supabaseConfigurado = Boolean(supabase)
export const servicoPecas = criarServicoPecas({ cliente: supabase, urlSupabase: SUPABASE_URL })

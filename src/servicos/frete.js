import { supabase } from './supabase'
import { criarServicoFrete } from './freteModelo'
export const calcularFrete = criarServicoFrete(supabase)

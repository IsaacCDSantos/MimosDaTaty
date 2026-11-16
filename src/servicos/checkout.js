import { supabase } from './supabase'
import { criarServicoCheckout } from './checkoutModelo'
export const operarCheckout = criarServicoCheckout(supabase)

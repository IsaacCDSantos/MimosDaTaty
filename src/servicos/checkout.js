import { supabase } from './supabase'
import { criarBuscaTentativaAberta, criarServicoCheckout } from './checkoutModelo'
export const operarCheckout = criarServicoCheckout(supabase)
export const buscarTentativaAberta = criarBuscaTentativaAberta(supabase)

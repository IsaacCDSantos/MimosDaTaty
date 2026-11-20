import { supabase } from './supabase'
import { criarServicoReferenciasPedido } from './referenciasPedidoModelo.js'

export const servicoReferenciasPedido = criarServicoReferenciasPedido({ cliente: supabase })

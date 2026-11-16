import { supabase } from './supabase'
import { criarServicoVisualizacoes } from './visualizacoes.js'

export const servicoVisualizacoes = criarServicoVisualizacoes({ cliente: supabase })

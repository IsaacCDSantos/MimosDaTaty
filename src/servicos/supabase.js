import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseUrl = SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

function criarCliente() {
  if (!supabaseUrl || !supabaseKey) return null
  try {
    return createClient(supabaseUrl, supabaseKey)
  } catch {
    // Uma configuração inválida não deve derrubar a vitrine pública.
    return null
  }
}

export const supabase = criarCliente()

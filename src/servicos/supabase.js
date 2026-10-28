import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
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

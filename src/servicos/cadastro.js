import { supabase } from './supabase';

export async function cadastrarCliente({ nome, email, senha }) {
  if (!supabase) {
    throw new Error('O cadastro está temporariamente indisponível. Tente novamente mais tarde.');
  }
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: senha,
    options: {
      data: { nome: nome.trim() },
      emailRedirectTo: new URL('/login', window.location.origin).href,
    },
  });

  if (error) {
    const mensagens = {
      user_already_exists: 'Não foi possível criar a conta com este e-mail. Tente entrar ou recuperar sua senha.',
      email_exists: 'Não foi possível criar a conta com este e-mail. Tente entrar ou recuperar sua senha.',
      weak_password: 'Escolha uma senha mais forte, com letras, números e símbolos.',
      over_email_send_rate_limit: 'Aguarde alguns minutos antes de tentar novamente.',
      over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      signup_disabled: 'O cadastro está temporariamente indisponível. Tente novamente mais tarde.',
      email_address_invalid: 'Verifique o endereço de e-mail informado.',
    };
    throw new Error(mensagens[error.code] || 'Não foi possível criar sua conta agora. Verifique sua conexão e tente novamente.');
  }

  if (!data?.user) {
    throw new Error('Não foi possível concluir o cadastro. Tente novamente mais tarde.');
  }

  // A confirmação é uma configuração do projeto Supabase, não do formulário.
  // Sem essa exigência, a própria API já devolve e persiste a sessão do cliente.
  return { confirmarEmail: !data.session };
}

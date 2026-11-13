function mensagemFalhaRecuperacao(error) {
  switch (error?.code) {
    case 'over_email_send_rate_limit':
      return 'O limite de envio de e-mails foi atingido. Aguarde antes de solicitar outro link.'
    case 'over_request_rate_limit':
      return 'Foram feitas muitas solicitações. Aguarde um pouco antes de tentar novamente.'
    case 'email_address_not_authorized':
      return 'O serviço de e-mail ainda não permite enviar o link para este endereço. Entre em contato com o atendimento.'
    case 'email_provider_disabled':
      return 'A recuperação por e-mail está indisponível no momento. Entre em contato com o atendimento.'
    case 'request_timeout':
      return 'O serviço demorou para responder. Tente novamente em alguns instantes.'
    case 'captcha_failed':
      return 'Não foi possível concluir a verificação de segurança. Atualize a página e tente novamente.'
    default:
      if (error?.status === 429) {
        return 'O limite de solicitações foi atingido. Aguarde antes de tentar novamente.'
      }
      if (error?.name === 'AuthRetryableFetchError' && error.status === 0) {
        return 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.'
      }
      return 'Não foi possível solicitar o link. Tente novamente mais tarde. Se o problema continuar, entre em contato com o atendimento.'
  }
}

// O mesmo pedido atende ao envio inicial e ao reenvio. O cliente é recebido
// explicitamente para testar as falhas sem disparar e-mails reais.
export async function solicitarRecuperacaoSenha(cliente, { email, origem, perfil }) {
  const endereco = email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) {
    throw new Error('Informe um e-mail válido.')
  }
  if (!cliente) {
    throw new Error('A recuperação está indisponível no momento.')
  }

  const retorno = new URL('/redefinir-senha', origem)
  if (perfil === 'admin') retorno.searchParams.set('perfil', 'admin')

  try {
    const { error } = await cliente.auth.resetPasswordForEmail(endereco, {
      redirectTo: retorno.href,
    })
    if (error) throw error
  } catch (error) {
    // Não expor a mensagem bruta do provedor, que pode conter dados pessoais.
    const falha = new Error(mensagemFalhaRecuperacao(error))
    falha.code = error?.code
    falha.status = error?.status
    throw falha
  }

  // Aceitação pela API não comprova existência da conta nem entrega do e-mail.
  return { email: endereco, solicitadoEm: Date.now() }
}

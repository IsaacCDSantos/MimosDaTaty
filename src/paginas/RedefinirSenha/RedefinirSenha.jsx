import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import RecuperacaoLayout from '../../componentes/RecuperacaoLayout/RecuperacaoLayout'
import { supabase } from '../../servicos/supabase'

export default function RedefinirSenha() {
  const location = useLocation()
  const parametros = new URLSearchParams(location.search)
  const perfilQuery = parametros.get('perfil') === 'admin' ? '?perfil=admin' : ''
  // Somente um estado visual para revisão. Não representa validação de token.
  const expirado = parametros.get('previa') === 'expirado'
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function salvar(event) {
  event.preventDefault()
  if (salvando) return

  const form = event.currentTarget
  const campos = new FormData(form)
  const senha = String(campos.get('senha') || '')

  if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    setErro('Use 8 ou mais caracteres, com letras e números.')
    return
  }

  if (senha !== campos.get('confirmacao')) {
    setErro('As senhas não coincidem. Confira a confirmação.')
    return
  }

  if (!supabase) {
    setErro('A recuperação está indisponível no momento.')
    return
  }

  setErro('')
  setSalvando(true)

  try {
    const { data, error: erroUsuario } = await supabase.auth.getUser()

    if (erroUsuario || !data.user) {
      setErro('Não foi possível validar seu acesso. Solicite um novo link.')
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: senha,
    })

    if (error) {
      setErro(
        error.code === 'same_password'
          ? 'Escolha uma senha diferente da atual.'
          : 'Não foi possível alterar a senha. Tente novamente.'
      )
      return
    }

    form.reset()
    setMostrar(false)
    setSucesso(true)
  } catch {
    setErro('Não foi possível conectar. Verifique sua conexão e tente novamente.')
  } finally {
    setSalvando(false)
  }
}

  if (sucesso) return (
    <RecuperacaoLayout titulo="Tudo pronto!" subtitulo="Senha alterada com sucesso."
    descricao="Você já pode entrar com sua nova senha."icone="confirmado">
      <Link className="senha-botao" to={'/login' + perfilQuery} replace>Voltar ao login</Link>
    </RecuperacaoLayout>
  )

  return (
    <RecuperacaoLayout titulo={expirado ? 'Vamos tentar de novo?' : 'Uma nova senha'} subtitulo={expirado ? 'Solicite um novo link.' : 'Para cuidar do seu acesso.'} descricao={expirado ? 'Exemplo de como a aplicação deve orientar quando o link for inválido ou expirar.' : 'Escolha uma senha diferente das anteriores.'}>
      {expirado ? <>
        <p className="senha-aviso" role="status">Prévia de link inválido ou expirado.</p>
        <Link className="senha-botao" to={'/recuperar-senha' + perfilQuery}>Solicitar novo link</Link>
        <Link className="senha-link" to={'/login' + perfilQuery}>Voltar ao login</Link>
      </> : <>
        {erro && <p id="redefinicao-erro" className="senha-aviso" role="alert">{erro}</p>}
        <form className="senha-form" onSubmit={salvar} onChange={() => setErro('')}>
          <div className="senha-campo"><label htmlFor="nova-senha">Nova senha</label><input id="nova-senha" name="senha" type={mostrar ? 'text' : 'password'} autoComplete="new-password" minLength={8} required placeholder="••••••••••" aria-describedby="senha-requisitos" /></div>
          <div className="senha-campo"><label htmlFor="confirmar-senha">Confirmar nova senha</label><input id="confirmar-senha" name="confirmacao" type={mostrar ? 'text' : 'password'} autoComplete="new-password" minLength={8} required placeholder="••••••••••" aria-describedby={erro ? 'redefinicao-erro' : undefined} /></div>
          <p id="senha-requisitos" className="senha-ajuda">Use 8 ou mais caracteres, com letras e números.</p>
          <button className="senha-mostrar" type="button" aria-pressed={mostrar} onClick={() => setMostrar(!mostrar)}>{mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}</button>
          <button className="senha-botao" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar nova senha'} </button>
        </form>
      </>}
    </RecuperacaoLayout>
  )
}

import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { carregarMercadoPago } from '../../servicos/checkoutModelo'

export default function CartaoMercadoPago({ publicKey, totalCentavos, controle, bloqueado }) {
  const prefixo = useId().replace(/[^a-zA-Z0-9]/g, '')
  const mp = useRef(null)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [opcoes, setOpcoes] = useState([])
  const [metodo, setMetodo] = useState('')
  const [parcelas, setParcelas] = useState('')
  const [mensagem, setMensagem] = useState('Carregando os campos seguros…')
  useEffect(() => {
    let ativo = true
    let versao = 0
    const campos = []
    carregarMercadoPago().then(MercadoPago => {
      if (!ativo) return
      const instancia = new MercadoPago(publicKey, { locale: 'pt-BR' })
      mp.current = instancia
      for (const [tipo, sufixo, placeholder] of [['cardNumber', 'numero', 'Número do cartão'], ['expirationDate', 'validade', 'MM/AA'], ['securityCode', 'cvv', 'CVV']]) {
        const campo = instancia.fields.create(tipo, { placeholder, style: { fontSize: '15px', color: '#333333', fontFamily: 'Arial' } }).mount(prefixo + sufixo)
        campos.push(campo)
      }
      campos[0].on('binChange', async ({ bin }) => {
        const atual = ++versao
        setMetodo(''); setOpcoes([]); setParcelas('')
        if (!bin) return
        setMensagem('Conferindo bandeira e parcelas…')
        try {
          const { results } = await instancia.getPaymentMethods({ bin })
          const cartao = results?.find(item => item.payment_type_id === 'credit_card')
          if (!cartao) throw new Error(results?.length
            ? 'Este cartão não é de crédito. Use um cartão de crédito ou pague com Pix.'
            : 'Não reconhecemos este cartão. Confira o número digitado ou pague com Pix.')
          const dados = await instancia.getInstallments({ amount: (totalCentavos / 100).toFixed(2), bin, paymentTypeId: 'credit_card' })
          const custos = dados?.find(item => item.payment_method_id === cartao.id)?.payer_costs || dados?.[0]?.payer_costs || []
          const validas = custos.filter(item => item.installments >= 1 && item.installments <= 12)
          if (!validas.length) throw new Error('Não encontramos parcelas disponíveis para este cartão.')
          if (!ativo || atual !== versao) return
          setMetodo(cartao.id); setOpcoes(validas); setParcelas(String(validas[0].installments)); setMensagem('')
        } catch (erro) { if (ativo && atual === versao) setMensagem(erro.message || 'Confira o cartão informado.') }
      })
      setMensagem('')
    }).catch(() => { if (ativo) setMensagem('Não foi possível carregar os campos seguros. Atualize a página ou escolha Pix.') })
    return () => { ativo = false; mp.current = null; for (const campo of campos) campo?.unmount?.() }
  }, [publicKey, totalCentavos, prefixo])
  useImperativeHandle(controle, () => ({
    async tokenizar() {
      if (!mp.current || !metodo || !parcelas || nome.trim().length < 2 || cpf.replace(/\D/g, '').length !== 11) throw new Error('Confira o titular, o CPF e os campos do cartão.')
      try {
        const token = await mp.current.fields.createCardToken({ cardholderName: nome.trim(), identificationType: 'CPF', identificationNumber: cpf.replace(/\D/g, '') })
        if (!token?.id) throw new Error()
        return { token: token.id, paymentMethodId: metodo, parcelas: Number(parcelas) }
      } catch { throw new Error('Confira o número, a validade, o CVV e os dados do titular.') }
    },
  }), [metodo, parcelas, nome, cpf])
  return <fieldset disabled={bloqueado} className="checkout-campos-cartao">
    <legend className="secao-titulo">Dados do cartão de crédito</legend>
    <div className="form-group"><label htmlFor={prefixo + 'numero'}>Número do cartão</label><div id={prefixo + 'numero'} className="campo-cartao-seguro" /></div>
    <div className="form-row"><div className="form-group flex-1"><label htmlFor={prefixo + 'validade'}>Validade</label><div id={prefixo + 'validade'} className="campo-cartao-seguro" /></div><div className="form-group flex-1"><label htmlFor={prefixo + 'cvv'}>CVV</label><div id={prefixo + 'cvv'} className="campo-cartao-seguro" /></div></div>
    <div className="form-group"><label htmlFor={prefixo + 'nome'}>Nome impresso no cartão</label><input id={prefixo + 'nome'} value={nome} maxLength={100} autoComplete="cc-name" onChange={e => setNome(e.target.value)} /></div>
    <div className="form-group"><label htmlFor={prefixo + 'cpf'}>CPF do titular</label><input id={prefixo + 'cpf'} value={cpf} maxLength={14} inputMode="numeric" onChange={e => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))} /></div>
    <div className="form-group"><label htmlFor={prefixo + 'parcelas'}>Parcelas disponíveis</label><select id={prefixo + 'parcelas'} value={parcelas} disabled={!opcoes.length || bloqueado} onChange={e => setParcelas(e.target.value)}><option value="">Preencha o cartão para consultar</option>{opcoes.map(o => <option key={o.installments} value={o.installments}>{o.recommended_message}</option>)}</select></div>
    {mensagem && <p className="frete-detalhe" role="status">{mensagem}</p>}
    <p className="frete-detalhe">Os dados do cartão são protegidos pelo Mercado Pago. Não salvamos seu cartão.</p>
  </fieldset>
}

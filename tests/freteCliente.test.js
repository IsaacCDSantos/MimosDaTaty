import test from 'node:test'
import assert from 'node:assert/strict'
import { adicionarItem, normalizarItens, mudarQuantidade, subtotalDoCarrinho, chaveDoCarrinho } from '../src/carrinho/modelo.js'
import { criarServicoFrete, validarCotacao, estadoDaCotacao } from '../src/servicos/freteModelo.js'
import { destinoAposLogin } from '../src/servicos/destinoLogin.js'
const produto = { id:'07df660c-e4b1-470b-9fef-b30e5ebcb7fe', nome:'Manta', preco:29.9, quantidade:2, tipoDisponibilidade:'pronta_entrega', estoque:5 }
const cotacao = () => ({ subtotalCentavos:5980, prazoProducaoDias:7, ambiente:'sandbox', expiraEm:new Date(Date.now()+600000).toISOString(), opcoes:[{id:'1',nome:'PAC',transportadora:'Correios',precoCentavos:1890,prazoMinDias:5,prazoMaxDias:6}] })
test('carrinho mantém centavos e agrega a quantidade sem duplicar peças',()=>{const a=adicionarItem([],produto); const b=adicionarItem(a,{...produto,quantidade:1}); assert.equal(b.length,1);assert.equal(b[0].quantidade,3);assert.equal(subtotalDoCarrinho(b),8970)})
test('estoque e limite de itens impedem aumentar indevidamente o carrinho',()=>{assert.throws(()=>adicionarItem([],{...produto,quantidade:6}),/estoque/);assert.throws(()=>adicionarItem([],{...produto,estoque:NaN}),/estoque/);const a=adicionarItem([],produto);assert.equal(mudarQuantidade(a,a[0].id,100)[0].quantidade,5);assert.deepEqual(mudarQuantidade(a,a[0].id,-2),[])})
test('recuperação do carrinho descarta dados inválidos e não persiste dados de pagamento',()=>{const [a]=adicionarItem([],produto); const itens=normalizarItens([{...a,cartao:'nao persistir'}, {...a,id:'x',quantidade:-1}, {...a,id:'y',precoCentavos:null},a]);assert.equal(itens.length,1);assert.equal('cartao' in itens[0],false);assert.deepEqual(normalizarItens({}),[])})
test('assinatura do carrinho ignora ordem e muda com quantidades ou preço',()=>{const a=adicionarItem([],produto);const b=adicionarItem(a,{...produto,id:'outro',quantidade:1});assert.equal(chaveDoCarrinho(b),chaveDoCarrinho([...b].reverse()));assert.notEqual(chaveDoCarrinho(a),chaveDoCarrinho(mudarQuantidade(a,a[0].id,1)))})
test('cotação de outro CEP/carrinho ou vencida não pode compor o total',()=>{const estado={chave:'a',situacao:'pronto',cotacao:{...cotacao(),expiraEm:'2026-11-15T23:10:00Z'}};assert.equal(estadoDaCotacao(estado,'b',0).situacao,'inicial');assert.equal(estadoDaCotacao(estado,'a',Date.parse('2026-11-15T23:11:00Z')).situacao,'expirado');assert.equal(estadoDaCotacao(estado,'a',Date.parse('2026-11-15T23:01:00Z')).situacao,'pronto')})
test('cliente envia somente CEP, IDs e quantidades; não envia preços ou cartão',async()=>{let enviado;const cliente={auth:{getSession:async()=>({data:{session:{}}})},functions:{invoke:async(nome,opcoes)=>{assert.equal(nome,'calcular-frete');enviado=opcoes.body;return{data:cotacao()}}}};const calcular=criarServicoFrete(cliente);await calcular({cepDestino:'61940-005',itens:[{...produto,preco:1,cartao:'privado'}]});assert.deepEqual(enviado,{cepDestino:'61940005',itens:[{pecaId:produto.id,quantidade:2}]})})
test('cliente valida CEP e sessão antes de invocar cotação',async()=>{let chamadas=0;const calcular=criarServicoFrete({auth:{getSession:async()=>({data:{session:null}})},functions:{invoke:async()=>{chamadas++}}});await assert.rejects(calcular({cepDestino:'abc',itens:[produto]}),/oito/);await assert.rejects(calcular({cepDestino:'61940005',itens:[produto]}),e=>e.codigo==='LOGIN_NECESSARIO');assert.equal(chamadas,0)})
test('falha de configuração do servidor é apresentada sem fallback de preço',async()=>{const calcular=criarServicoFrete({auth:{getSession:async()=>({data:{session:{}}})},functions:{invoke:async()=>({error:{context:{json:async()=>({codigo:'FRETE_NAO_CONFIGURADO',mensagem:'Frete ainda indisponível.'})}}})}});await assert.rejects(calcular({cepDestino:'61940005',itens:[produto]}),e=>e.codigo==='FRETE_NAO_CONFIGURADO'&&e.message==='Frete ainda indisponível.')})
test('cliente aceita frete zero explícito e rejeita valores ausentes ou negativos',()=>{const a=cotacao();a.opcoes[0].precoCentavos=0;assert.equal(validarCotacao(a).opcoes[0].precoCentavos,0);for(const valor of [null,undefined,-1,NaN]){a.opcoes[0].precoCentavos=valor;assert.throws(()=>validarCotacao(a),/inválida/)}assert.throws(()=>validarCotacao({...cotacao(),opcoes:[]}),/inválida/)})

test('cotação vencida, com data inválida ou validade excessiva é recusada', () => {
 const agora = Date.now()
 for (const expiraEm of [new Date(agora - 1).toISOString(), new Date(agora).toISOString(), new Date(agora + 3600000).toISOString(), 'invalida']) {
  assert.throws(() => validarCotacao({ ...cotacao(), expiraEm }, agora), /inválida|expirou/)
 }
 assert.doesNotThrow(() => validarCotacao({ ...cotacao(), expiraEm: new Date(agora + 600000).toISOString() }, agora))
})

test('voltar ao mesmo CEP com outro vínculo não recupera cotação ou seleção anterior', () => {
 const visitaAnterior = { chave: '01001000|manta:1' }
 const novaVisita = { chave: '01001000|manta:1' }
 const estado = { chave: visitaAnterior, situacao: 'pronto', cotacao: cotacao() }
 assert.equal(estadoDaCotacao(estado, visitaAnterior).situacao, 'pronto')
 assert.equal(estadoDaCotacao(estado, novaVisita).situacao, 'inicial')
 assert.equal(estadoDaCotacao({ ...estado, cotacao: { expiraEm: 'invalida' } }, visitaAnterior).situacao, 'expirado')
})

test('login do cliente volta ao checkout somente para destinos internos permitidos', () => {
 assert.equal(destinoAposLogin('cliente', '/checkout'), '/checkout')
 assert.equal(destinoAposLogin('cliente', '/carrinho'), '/carrinho')
 for (const destino of ['https://exemplo.test', '//exemplo.test', '/admin', '/checkout?redirect=https://exemplo.test', undefined]) {
  assert.equal(destinoAposLogin('cliente', destino), '/')
 }
 assert.equal(destinoAposLogin('admin', '/checkout'), '/admin')
})

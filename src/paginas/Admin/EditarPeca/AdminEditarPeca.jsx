import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { lerFotoDaPeca } from '../CatalogoAdmin/fotoCatalogo';
import { CATEGORIAS_CATALOGO } from '../CatalogoAdmin/catalogoModelo';
import './AdminEditarPeca.css';

export const AdminEditarPeca = ({ pecaInicial = null, aoSalvar, aoExcluir, voltarPara, categorias = CATEGORIAS_CATALOGO.map(nome => ({ nome, ativa: true })), operacaoPendente = false, confirmacaoPendente = false }) => {
  const fileInputRef = useRef(null);
  const envioPendente = useRef(false);
  const conferirResultado = useRef(false);
  const [requerConferencia, setRequerConferencia] = useState(false);
  const confirmarExclusao = useRef(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');
  const [fotoPreview, setFotoPreview] = useState(pecaInicial?.imagem || null);
  const [fotoArquivo, setFotoArquivo] = useState(null);
  const [aviso, setAviso] = useState('');
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const bloqueado = carregandoFoto || salvando || operacaoPendente || excluindo;
  const edicaoBloqueada = bloqueado || confirmacaoPendente || requerConferencia;
  const inicio = '/admin';
  const catalogo = voltarPara || inicio + '/catalogo';
  const [peca, setPeca] = useState(() => pecaInicial ? { ...pecaInicial, preco: pecaInicial.preco.toFixed(2).replace('.', ','), estoque: String(pecaInicial.estoque) } : {
    nome: '', descricao: '', preco: '', categoria: categorias[0]?.nome || '',
    prazo: '7 dias úteis', estoque: '0', visivel: true, tipoDisponibilidade: 'sob_encomenda',
  });

  const handleChange = (e) => {
    if (edicaoBloqueada) return;
    setAviso('');
    const { name, value, type, checked } = e.target;
    setPeca(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const impedirNavegacao = (e) => { if (bloqueado) e.preventDefault(); };
  const handleAbrirCameraOuGaleria = () => { if (!edicaoBloqueada) fileInputRef.current.click(); };
  const handleFotoChange = async (e) => {
    if (edicaoBloqueada) return;
    const input = e.target;
    const arquivo = input.files[0];
    if (!arquivo) return;
    setCarregandoFoto(true);
    setAviso('Carregando foto...');
    try {
      const foto = await lerFotoDaPeca(arquivo);
      setFotoPreview(foto);
      setFotoArquivo(arquivo);
      setAviso('');
    } catch (erro) { setAviso(erro.message); }
    finally { setCarregandoFoto(false); input.value = ''; }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (envioPendente.current || bloqueado || confirmacaoPendente || conferirResultado.current) return;
    if (!aoSalvar) {
      setAviso('Abra este formulário a partir do catálogo administrativo.');
      return;
    }
    envioPendente.current = true;
    setSalvando(true);
    setAviso('Salvando peça...');
    try { await aoSalvar({ ...peca, imagem: fotoPreview, fotoArquivo }); }
    catch (erro) { if (erro.resultadoIncerto) { conferirResultado.current = true; setRequerConferencia(true); } setAviso(erro.message || 'Não foi possível salvar. Seus dados foram mantidos para tentar novamente.'); }
    finally { envioPendente.current = false; setSalvando(false); }
  };

  const handleExcluir = async () => {
    if (!aoExcluir || envioPendente.current || edicaoBloqueada) return;
    envioPendente.current = true;
    setExcluindo(true);
    setErroExclusao('');
    try { await aoExcluir(); confirmarExclusao.current?.close(); }
    catch (erro) { if (erro.resultadoIncerto) { conferirResultado.current = true; setRequerConferencia(true); } setErroExclusao(erro.message || 'Não foi possível excluir a peça. Tente novamente.'); }
    finally { envioPendente.current = false; setExcluindo(false); }
  };


  return (
    <div className="admin-page-bg admin-editar-peca">
      <nav className="admin-nav" aria-label="Navegação administrativa">
        <div className="nav-links">
          <Link className="nav-btn" aria-disabled={bloqueado} onClick={impedirNavegacao} to={inicio}>Home</Link>
          <Link className="nav-btn" aria-disabled={bloqueado} onClick={impedirNavegacao} to={catalogo}>Catálogo</Link>
          <Link className="nav-btn" aria-disabled={bloqueado} onClick={impedirNavegacao} to={`${inicio}/pedidos`}>Pedidos</Link>
        </div>
        <div className="nav-user">
          <span className="nav-btn-user">Admin</span>
        </div>
      </nav>

      <main className="form-card">
        <Link className="btn-voltar" aria-disabled={bloqueado} onClick={impedirNavegacao} to={catalogo}>← Voltar ao catálogo</Link>

        <h1 className="titulo-editar">Editar peça</h1>
        <p className="subtitulo-editar">
          Confira os dados da peça neste formulário.
        </p>
        <p className="aviso-catalogo">As peças e as fotos serão salvas no catálogo da loja.</p>

        <form id="editar-peca-form" onSubmit={handleSalvar} className="form-grid">
          {/* Coluna da Esquerda: Foto */}
          <div className="coluna-foto">
            <button
              type="button"
              className="foto-placeholder"
              onClick={handleAbrirCameraOuGaleria}
              disabled={edicaoBloqueada}
              style={{ cursor: 'pointer' }}
            >
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview da peça" className="foto-preview-img" />
              ) : (
                <span>Foto da peça</span>
              )}
            </button>

            <button
              type="button"
              className="btn-outline"
              onClick={handleAbrirCameraOuGaleria}
              disabled={edicaoBloqueada}
            >
              Trocar foto
            </button>

            {/* Input invisível que faz a mágica acontecer */}
            <input
              type="file"
              disabled={edicaoBloqueada}
              aria-label="Selecionar foto da peça"
              accept="image/png,image/jpeg,image/webp,image/avif"
              ref={fileInputRef}
              onChange={handleFotoChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Coluna da Direita: Dados da Peça */}
          <div className="coluna-dados">
            <div className="campo">
              <label htmlFor="editar-peca-nome">Nome da peça</label>
              <input id="editar-peca-nome" type="text" name="nome" minLength={2} maxLength={120} value={peca.nome} onChange={handleChange} required  disabled={edicaoBloqueada} />
            </div>

            <div className="campo">
              <label htmlFor="editar-peca-descricao">Descrição</label>
              <textarea id="editar-peca-descricao" name="descricao" rows="3" required maxLength={2000} value={peca.descricao} onChange={handleChange}  disabled={edicaoBloqueada} />
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label htmlFor="editar-peca-preco">Preço (R$)</label>
                <input id="editar-peca-preco" type="text" inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" name="preco" value={peca.preco} onChange={handleChange} required  disabled={edicaoBloqueada} />
              </div>
              <div className="campo">
                <label htmlFor="editar-peca-categoria">Categoria</label>
                <select id="editar-peca-categoria" name="categoria" value={peca.categoria} onChange={handleChange} disabled={edicaoBloqueada} required>
                  {categorias.map(categoria => <option key={categoria.id || categoria.nome} value={categoria.nome}>{categoria.nome}{categoria.ativa === false ? ' (inativa)' : ''}</option>)}
                </select>
              </div>
            </div>

            {/* O ateliê só trabalha sob encomenda: não há estoque nem disponibilidade para escolher. */}
            <div className="campo">
              <label htmlFor="editar-peca-prazo">Prazo de entrega</label>
              <input id="editar-peca-prazo" type="text" name="prazo" value={peca.prazo} onChange={handleChange}  disabled={edicaoBloqueada} />
            </div>

            <div className="campo-toggle">
              <label className="toggle-label" htmlFor="editar-peca-visivel">
                <strong>Visível no catálogo</strong>
                <div className="toggle-switch">
                  <input id="editar-peca-visivel" type="checkbox" name="visivel" checked={peca.visivel} onChange={handleChange}  disabled={edicaoBloqueada} />
                  <span className="slider"></span>
                </div>
              </label>
            </div>
          </div>
        </form>
        {aviso && <p className="aviso-formulario" role="status">{aviso}</p>}
        {(confirmacaoPendente || requerConferencia) && <p className="aviso-formulario" role="alert">Confira a última gravação antes de alterar outra peça. <Link to={catalogo}>Conferir catálogo</Link></p>}

        <div className="acoes-rodape">
          <button type="button" className="btn-outline btn-excluir" disabled={!aoExcluir || edicaoBloqueada} onClick={() => { setErroExclusao(''); confirmarExclusao.current.showModal(); }}>
            Excluir peça
          </button>
          <div className="acoes-direita">
            <Link className="btn-outline" aria-disabled={bloqueado} onClick={impedirNavegacao} to={catalogo}>Cancelar</Link>
            <button type="submit" form="editar-peca-form" className="btn-salvar" disabled={edicaoBloqueada}>
              {salvando ? 'Salvando...' : carregandoFoto ? 'Carregando foto...' : 'Salvar peça'}
            </button>
          </div>
        </div>
      </main>
      <dialog ref={confirmarExclusao} className="catalog-admin-delete-dialog" aria-labelledby="catalog-admin-delete-title" onCancel={event => { if (bloqueado) event.preventDefault(); }}>
        <h2 id="catalog-admin-delete-title">Excluir esta peça?</h2>
        <p>A peça sairá do catálogo. Os pedidos anteriores e suas fotos serão preservados.</p>{erroExclusao && <p role="alert">{erroExclusao}</p>}
        <div>{confirmacaoPendente || requerConferencia ? <Link className="btn-outline" to={catalogo}>Conferir catálogo</Link> : <button type="button" className="btn-outline" disabled={bloqueado} onClick={() => confirmarExclusao.current.close()}>Não, manter peça</button>}<button type="button" className="btn-salvar" disabled={edicaoBloqueada} onClick={handleExcluir}>{excluindo ? 'Excluindo...' : 'Confirmar exclusão'}</button></div>
      </dialog>
    </div>
  );
};

export default AdminEditarPeca;

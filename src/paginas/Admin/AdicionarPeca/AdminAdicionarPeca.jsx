import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../servicos/supabase';
import { carregarCategoriasPecas, registrarImagemPeca, salvarPeca, validarDadosPeca, validarFoto } from '../../../servicos/pecasAdmin.js';
import './AdminAdicionarPeca.css';


export const AdminAdicionarPeca = ({ demonstracao = false }) => {
  const fileInputRef = useRef(null);
  const envioEmAndamento = useRef(false);
  const [pendenciaImagem, setPendenciaImagem] = useState(null);
  const [salvamentoIncerto, setSalvamentoIncerto] = useState(null);
  const [carregandoCategorias, setCarregandoCategorias] = useState(!demonstracao && !!supabase);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoArquivo, setFotoArquivo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(!demonstracao && !supabase ? 'Serviço do banco de dados não configurado.' : '');
  const inicio = demonstracao ? '/previa/admin' : '/admin';

  const [peca, setPeca] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria_id: demonstracao ? 'Maternidade' : '',
    prazo: '7 dias úteis',
    estoque: '3 unidades',
    visivel: true,
  });

  // Libera memória da URL de pré-visualização ao desmontar ou trocar foto
  useEffect(() => () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
  }, [fotoPreview]);

  // Carrega as categorias ativas do Supabase
  useEffect(() => {
    if (demonstracao || !supabase) return;

    let ativo = true;
    carregarCategoriasPecas(supabase).then((data) => {
      if (!ativo) return;
      setCategorias(data);
      setPeca((prev) => ({ ...prev, categoria_id: data[0]?.id || '' }));
      if (!data.length) setAviso('Nenhuma categoria ativa disponível. Cadastre ou ative uma categoria antes de salvar.');
    }).catch((erro) => {
      if (ativo) setAviso(erro.message);
    }).finally(() => {
      if (ativo) setCarregandoCategorias(false);
    });
    return () => { ativo = false; };
  }, [demonstracao]);

  const handleChange = (e) => {
    setAviso('');
    const { name, value, type, checked } = e.target;
    setPeca((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAbrirCameraOuGaleria = () => {
    fileInputRef.current.click();
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try { validarFoto(file); } catch (erro) {
      setAviso(erro.message);
      e.target.value = '';
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setFotoPreview(imageUrl);
    setFotoArquivo(file);
    setAviso('');
  };

  const limparFormulario = () => {
    setPeca({
      nome: '',
      descricao: '',
      preco: '',
      categoria_id: categorias[0]?.id || '',
      prazo: '7 dias úteis',
      estoque: '3 unidades',
      visivel: true,
    });
    setFotoPreview(null);
    setFotoArquivo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (envioEmAndamento.current || pendenciaImagem || salvamentoIncerto) return;
    try {
      const dados = validarDadosPeca(peca, categorias, demonstracao);
      if (demonstracao) {
        setAviso('Prévia validada. Os dados não foram salvos no modo demonstração.');
        return;
      }
      validarFoto(fotoArquivo);
      envioEmAndamento.current = true;
      setSalvando(true);
      setAviso('Salvando peça...');
      const resultado = await salvarPeca(supabase, { dados, foto: fotoArquivo });
      limparFormulario();
      setPendenciaImagem(resultado.pendenciaImagem);
      setAviso(resultado.pendenciaImagem
        ? 'Peça cadastrada. Não foi possível concluir o registro da foto; tente novamente abaixo, sem cadastrar outra peça.'
        : 'Peça cadastrada com sucesso!');
    } catch (erro) {
      if (erro.resultadoIncerto) setSalvamentoIncerto(erro.idPeca);
      setAviso(erro.message || 'Não foi possível cadastrar a peça.');
    } finally {
      envioEmAndamento.current = false;
      setSalvando(false);
    }
  };

  const tentarRegistrarFoto = async () => {
    if (envioEmAndamento.current || !pendenciaImagem) return;
    envioEmAndamento.current = true;
    setSalvando(true);
    try {
      await registrarImagemPeca(supabase, pendenciaImagem);
      setPendenciaImagem(null);
      setAviso('Foto registrada. A peça está salva com sucesso!');
    } catch (erro) { setAviso(erro.message); }
    finally { envioEmAndamento.current = false; setSalvando(false); }
  };

  const podeSalvar = demonstracao || (!!supabase && !carregandoCategorias && categorias.length > 0);

  return (
    <div className="admin-page-bg admin-adicionar-peca">
      <nav className="admin-nav" aria-label="Navegação administrativa">
        <div className="nav-links">
          <Link className="nav-btn" to={inicio}>Home</Link>
          <Link className="nav-btn" to="/catalogo">Catálogo</Link>
          <Link className="nav-btn" to={`${inicio}/pedidos`}>Pedidos</Link>
        </div>
        <div className="nav-user">
          <span className="nav-btn-user">{demonstracao ? 'Prévia: Tati' : 'Admin'}</span>
        </div>
      </nav>

      <main className="form-card">
        <Link className="btn-voltar" to={inicio}>← Voltar ao painel</Link>

        <h1 className="titulo-editar">Adicionar</h1>
        <p className="subtitulo-editar">
          Para adicionar uma peça nova, preencha este formulário.
        </p>
        {demonstracao && (
          <p className="aviso-demonstracao">
            Demonstração: os campos e a foto são apenas uma prévia. Nenhuma peça será salva.
          </p>
        )}

        <form id="adicionar-peca-form" onSubmit={handleSalvar} className="form-grid">
          <div className="coluna-foto">
            <button
              type="button"
              className="foto-placeholder"
              onClick={handleAbrirCameraOuGaleria}
              style={{ cursor: 'pointer' }}
              disabled={salvando}
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
              disabled={salvando}
            >
              Adicionar foto
            </button>

            <input
              type="file"
              aria-label="Selecionar foto da peça"
              accept="image/jpeg,image/png,image/webp,image/avif"
              ref={fileInputRef}
              onChange={handleFotoChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="coluna-dados">
            <div className="campo">
              <label htmlFor="adicionar-peca-nome">Nome da peça</label>
              <input
                id="adicionar-peca-nome"
                type="text"
                name="nome"
                value={peca.nome}
                onChange={handleChange}
                placeholder="Ex: Kit de berço florido"
                disabled={salvando}
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="adicionar-peca-descricao">Descrição</label>
              <textarea
                id="adicionar-peca-descricao"
                name="descricao"
                rows="3"
                value={peca.descricao}
                onChange={handleChange}
                placeholder="Detalhes da peça..."
                disabled={salvando}
              />
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label htmlFor="adicionar-peca-preco">Preço (R$)</label>
                <input
                  id="adicionar-peca-preco"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]+([,.][0-9]{1,2})?"
                  name="preco"
                  value={peca.preco}
                  onChange={handleChange}
                  placeholder="0,00"
                  disabled={salvando}
                  required
                />
              </div>
              <div className="campo">
                <label htmlFor="adicionar-peca-categoria">Categoria</label>
                <select
                  id="adicionar-peca-categoria"
                  name="categoria_id"
                  value={peca.categoria_id}
                  onChange={handleChange}
                  disabled={salvando || (!demonstracao && (carregandoCategorias || !categorias.length))}
                >
                  {categorias.length > 0 ? (
                    categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))
                  ) : demonstracao ? (
                    <>
                      <option value="Maternidade">Maternidade</option>
                      <option value="Enxovais">Enxovais</option>
                      <option value="Crochê & Bordado">Crochê & Bordado</option>
                      <option value="Presentes">Presentes</option>
                    </>
                  ) : <option value="">{carregandoCategorias ? 'Carregando categorias...' : 'Nenhuma categoria disponível'}</option>}
                </select>
              </div>
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label htmlFor="adicionar-peca-prazo">Prazo de entrega (dias)</label>
                <input
                  id="adicionar-peca-prazo"
                  type="text"
                  name="prazo"
                  value={peca.prazo}
                  onChange={handleChange}
                  disabled={salvando}
                />
              </div>
              <div className="campo">
                <label htmlFor="adicionar-peca-estoque">Estoque (unidades)</label>
                <input
                  id="adicionar-peca-estoque"
                  type="text"
                  name="estoque"
                  value={peca.estoque}
                  onChange={handleChange}
                  disabled={salvando}
                />
              </div>
            </div>

            <div className="campo-toggle">
              <label className="toggle-label" htmlFor="adicionar-peca-visivel">
                <strong>Visível no catálogo</strong>
                <div className="toggle-switch">
                  <input
                    id="adicionar-peca-visivel"
                    type="checkbox"
                    name="visivel"
                    checked={peca.visivel}
                    onChange={handleChange}
                    disabled={salvando}
                  />
                  <span className="slider"></span>
                </div>
              </label>
            </div>
          </div>
        </form>

        {aviso && <p className="aviso-formulario" role="status">{aviso}</p>}
        {pendenciaImagem && <button type="button" className="btn-outline" disabled={salvando} onClick={tentarRegistrarFoto}>Tentar registrar foto novamente</button>}
        {salvamentoIncerto && <Link className="btn-outline" to={`${inicio}/editar-peca?id=${salvamentoIncerto}`}>Conferir peça</Link>}

        <div className="acoes-rodape">
          <button type="button" className="btn-outline btn-excluir" disabled>
            Excluir peça
          </button>
          <div className="acoes-direita">
            <Link className="btn-outline" to={inicio}>Cancelar</Link>
            <button
              type="submit"
              form="adicionar-peca-form"
              className="btn-salvar"
              disabled={salvando || !podeSalvar || !!pendenciaImagem || !!salvamentoIncerto}
            >
              {salvando ? 'Salvando...' : demonstracao ? 'Validar prévia' : 'Salvar peça'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAdicionarPeca;
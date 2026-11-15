import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../servicos/supabase';
import { arquivarPeca, carregarCategoriasPecas, registrarImagemPeca, salvarPeca, validarDadosPeca, validarFoto } from '../../../servicos/pecasAdmin.js';
import './AdminEditarPeca.css';

export const AdminEditarPeca = ({ demonstracao = false }) => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const idPeca = params.id || params.pecaId || searchParams.get('id');
  return <FormularioEditarPeca key={`${demonstracao}-${idPeca}`} demonstracao={demonstracao} idPeca={idPeca} />;
};

function FormularioEditarPeca({ demonstracao, idPeca }) {
  const fileInputRef = useRef(null);
  const envioEmAndamento = useRef(false);
  const navigate = useNavigate();
  const [versao, setVersao] = useState(null);
  const [pendenciaImagem, setPendenciaImagem] = useState(null);
  const [salvamentoIncerto, setSalvamentoIncerto] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoArquivo, setFotoArquivo] = useState(null);
  const [imagemAtualUrl, setImagemAtualUrl] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(!demonstracao && !!supabase && !!idPeca);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [aviso, setAviso] = useState(demonstracao ? '' : !supabase ? 'Serviço do banco de dados não configurado.' : !idPeca ? 'ID da peça não informado na URL.' : '');
  const inicio = demonstracao ? '/previa/admin' : '/admin';

  const [peca, setPeca] = useState({
    nome: demonstracao ? 'Kit de berço florido' : '',
    descricao: demonstracao ? 'Conjunto com manta, toalha e trocador em crochê com acabamento delicado.' : '',
    preco: demonstracao ? '189,00' : '',
    categoria_id: demonstracao ? 'Maternidade' : '',
    prazo: '7 dias úteis',
    estoque: '3 unidades',
    visivel: true,
  });

  // Libera memória apenas se o preview for um arquivo local (blob:)
  useEffect(() => () => {
    if (fotoPreview && fotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(fotoPreview);
    }
  }, [fotoPreview]);

  // A chave do formulário reinicia o estado ao trocar de ID, sem misturar fotos entre peças.
  useEffect(() => {
    if (demonstracao || !supabase || !idPeca) return;
    let ativo = true;
    async function carregarDados() {
      try {
        const [listaCategorias, resPeca] = await Promise.all([
          carregarCategoriasPecas(supabase),
          supabase.from('pecas').select('*').eq('id', idPeca).single(),
        ]);
        if (!ativo) return;
        if (resPeca.error || !resPeca.data) throw new Error('Não foi possível carregar os dados desta peça.');
        const dados = resPeca.data;
        setCategorias(listaCategorias);
        setVersao(dados.atualizado_em);
        setPeca({
          nome: dados.nome || '', descricao: dados.descricao || '',
          preco: (dados.preco_centavos / 100).toFixed(2).replace('.', ','),
          categoria_id: dados.categoria_id,
          prazo: `${dados.prazo_producao_dias} dias úteis`,
          estoque: `${dados.estoque_atual ?? 0} unidades`, visivel: dados.visivel,
        });
        setImagemAtualUrl(dados.imagem_capa_url);
        setFotoPreview(dados.imagem_capa_url);
        if (!listaCategorias.some(cat => cat.id === dados.categoria_id)) {
          setAviso('Selecione uma categoria ativa antes de salvar esta peça.');
        }
      } catch (erro) {
        if (ativo) setAviso(erro.message);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregarDados();
    return () => { ativo = false; };
  }, [demonstracao, idPeca]);

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

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (envioEmAndamento.current || pendenciaImagem || salvamentoIncerto) return;
    try {
      const dados = validarDadosPeca(peca, categorias, demonstracao);
      if (demonstracao) {
        setAviso('Prévia validada. Os dados não foram salvos no modo demonstração.');
        return;
      }
      if (!versao) throw new Error('Carregue uma peça válida antes de salvar.');
      envioEmAndamento.current = true;
      setSalvando(true);
      setAviso('Salvando alterações...');
      const resultado = await salvarPeca(supabase, { dados, foto: fotoArquivo, id: idPeca, versao, imagemAtualUrl });
      setVersao(resultado.peca.atualizado_em);
      setImagemAtualUrl(resultado.peca.imagem_capa_url);
      setFotoPreview(resultado.peca.imagem_capa_url);
      setFotoArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPendenciaImagem(resultado.pendenciaImagem);
      setAviso(resultado.pendenciaImagem
        ? 'Alterações salvas. Não foi possível concluir o registro da foto; tente novamente abaixo.'
        : 'Alterações salvas com sucesso!');
    } catch (erro) {
      if (erro.resultadoIncerto) setSalvamentoIncerto(true);
      setAviso(erro.message || 'Não foi possível salvar a peça.');
    } finally { envioEmAndamento.current = false; setSalvando(false); }
  };

  const tentarRegistrarFoto = async () => {
    if (envioEmAndamento.current || !pendenciaImagem) return;
    envioEmAndamento.current = true;
    setSalvando(true);
    try {
      await registrarImagemPeca(supabase, pendenciaImagem);
      setPendenciaImagem(null);
      setAviso('Foto registrada. As alterações estão salvas com sucesso!');
    } catch (erro) { setAviso(erro.message); }
    finally { envioEmAndamento.current = false; setSalvando(false); }
  };

  const handleExcluir = async () => {
    if (demonstracao || envioEmAndamento.current || !versao || salvamentoIncerto || pendenciaImagem) return;
    if (!window.confirm(`Tem certeza que deseja excluir "${peca.nome}"? Ela será removida do catálogo.`)) return;
    envioEmAndamento.current = true;
    setExcluindo(true);
    setAviso('Excluindo peça...');
    try {
      await arquivarPeca(supabase, idPeca, versao);
      navigate(inicio);
    } catch (erro) { setAviso(erro.message || 'Não foi possível excluir a peça.'); }
    finally { envioEmAndamento.current = false; setExcluindo(false); }
  };

  const bloqueado = carregando || salvando || excluindo || salvamentoIncerto || (!demonstracao && !versao);

  return (
    <div className="admin-page-bg admin-editar-peca">
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

        <h1 className="titulo-editar">Editar peça</h1>
        <p className="subtitulo-editar">
          {carregando ? 'Carregando dados da peça...' : 'Confira os dados da peça neste formulário.'}
        </p>
        {demonstracao && (
          <p className="aviso-demonstracao">
            Demonstração com uma peça fictícia: os campos e a foto são apenas uma prévia. Nenhuma alteração será salva.
          </p>
        )}

        <form id="editar-peca-form" onSubmit={handleSalvar} className="form-grid">
          <div className="coluna-foto">
            <button
              type="button"
              className="foto-placeholder"
              onClick={handleAbrirCameraOuGaleria}
              style={{ cursor: 'pointer' }}
              disabled={bloqueado}
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
              disabled={bloqueado}
            >
              Trocar foto
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
              <label htmlFor="editar-peca-nome">Nome da peça</label>
              <input
                id="editar-peca-nome"
                type="text"
                name="nome"
                value={peca.nome}
                onChange={handleChange}
                disabled={bloqueado}
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="editar-peca-descricao">Descrição</label>
              <textarea
                id="editar-peca-descricao"
                name="descricao"
                rows="3"
                value={peca.descricao}
                onChange={handleChange}
                disabled={bloqueado}
              />
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label htmlFor="editar-peca-preco">Preço (R$)</label>
                <input
                  id="editar-peca-preco"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]+([,.][0-9]{1,2})?"
                  name="preco"
                  value={peca.preco}
                  onChange={handleChange}
                  disabled={bloqueado}
                  required
                />
              </div>
              <div className="campo">
                <label htmlFor="editar-peca-categoria">Categoria</label>
                <select
                  id="editar-peca-categoria"
                  name="categoria_id"
                  value={peca.categoria_id}
                  onChange={handleChange}
                  disabled={bloqueado}
                >
                  {!demonstracao && categorias.length > 0 && !categorias.some(cat => cat.id === peca.categoria_id) && <option value="">Selecione uma categoria ativa</option>}
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
                  ) : <option value="">Nenhuma categoria disponível</option>}
                </select>
              </div>
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label htmlFor="editar-peca-prazo">Prazo de entrega</label>
                <input
                  id="editar-peca-prazo"
                  type="text"
                  name="prazo"
                  value={peca.prazo}
                  onChange={handleChange}
                  disabled={bloqueado}
                />
              </div>
              <div className="campo">
                <label htmlFor="editar-peca-estoque">Estoque</label>
                <input
                  id="editar-peca-estoque"
                  type="text"
                  name="estoque"
                  value={peca.estoque}
                  onChange={handleChange}
                  disabled={bloqueado}
                />
              </div>
            </div>

            <div className="campo-toggle">
              <label className="toggle-label" htmlFor="editar-peca-visivel">
                <strong>Visível no catálogo</strong>
                <div className="toggle-switch">
                  <input
                    id="editar-peca-visivel"
                    type="checkbox"
                    name="visivel"
                    checked={peca.visivel}
                    onChange={handleChange}
                    disabled={bloqueado}
                  />
                  <span className="slider"></span>
                </div>
              </label>
            </div>
          </div>
        </form>

        {aviso && <p className="aviso-formulario" role="status">{aviso}</p>}
        {pendenciaImagem && <button type="button" className="btn-outline" disabled={salvando} onClick={tentarRegistrarFoto}>Tentar registrar foto novamente</button>}
        {salvamentoIncerto && <button type="button" className="btn-outline" onClick={() => window.location.reload()}>Recarregar peça para conferir</button>}

        <div className="acoes-rodape">
          <button
            type="button"
            className="btn-outline btn-excluir"
            onClick={handleExcluir}
            disabled={demonstracao || bloqueado || !idPeca || !!pendenciaImagem}
          >
            {excluindo ? 'Excluindo...' : 'Excluir peça'}
          </button>
          <div className="acoes-direita">
            <Link className="btn-outline" to={inicio}>Cancelar</Link>
            <button
              type="submit"
              form="editar-peca-form"
              className="btn-salvar"
              disabled={bloqueado || !!pendenciaImagem || (!demonstracao && !categorias.length)}
            >
              {salvando ? 'Salvando...' : demonstracao ? 'Validar prévia' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminEditarPeca;

import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../servicos/supabase';
import './AdminEditarPeca.css';

const TIPOS_IMAGEM_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

export const AdminEditarPeca = ({ demonstracao = false }) => {
  const fileInputRef = useRef(null);
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Aceita tanto rota /admin/editar-peca/:id quanto /admin/editar-peca?id=...
  const idPeca = params.id || params.pecaId || searchParams.get('id');

  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoArquivo, setFotoArquivo] = useState(null);
  const [imagemAtualUrl, setImagemAtualUrl] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(!demonstracao);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [aviso, setAviso] = useState('');
  const inicio = demonstracao ? '/previa/admin' : '/admin';

  const [peca, setPeca] = useState({
    nome: demonstracao ? 'Kit de berço florido' : '',
    descricao: demonstracao ? 'Conjunto com manta, toalha e trocador em crochê com acabamento delicado.' : '',
    preco: demonstracao ? '189,00' : '',
    categoria_id: '',
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

  // Carrega categorias e os dados da peça do Supabase
  useEffect(() => {
    if (demonstracao) return;

    if (!supabase) {
      setAviso('Serviço do banco de dados não configurado.');
      setCarregando(false);
      return;
    }

    if (!idPeca) {
      setAviso('ID da peça não informado na URL.');
      setCarregando(false);
      return;
    }

    let ativo = true;

    async function carregarDados() {
      setCarregando(true);
      setAviso('');

      const [resCategorias, resPeca] = await Promise.all([
        supabase
          .from('categorias')
          .select('id, nome')
          .eq('ativa', true)
          .order('ordem', { ascending: true }),
        supabase
          .from('pecas')
          .select('*')
          .eq('id', idPeca)
          .single(),
      ]);

      if (!ativo) return;

      if (resCategorias.error) {
        console.error('Erro ao carregar categorias:', resCategorias.error);
      } else if (resCategorias.data) {
        setCategorias(resCategorias.data);
      }

      if (resPeca.error || !resPeca.data) {
        console.error('Erro ao carregar peça:', resPeca.error);
        setAviso('Não foi possível carregar os dados desta peça.');
        setCarregando(false);
        return;
      }

      const dados = resPeca.data;
      const precoFormatado = typeof dados.preco_centavos === 'number'
        ? (dados.preco_centavos / 100).toFixed(2).replace('.', ',')
        : '';

      setPeca({
        nome: dados.nome || '',
        descricao: dados.descricao || '',
        preco: precoFormatado,
        categoria_id: dados.categoria_id || resCategorias.data?.[0]?.id || '',
        prazo: dados.prazo_producao_dias != null ? `${dados.prazo_producao_dias} dias úteis` : '7 dias úteis',
        estoque: dados.estoque_atual != null ? `${dados.estoque_atual} unidades` : '0 unidades',
        visivel: dados.visivel ?? true,
      });

      if (dados.imagem_capa_url) {
        setImagemAtualUrl(dados.imagem_capa_url);
        setFotoPreview(dados.imagem_capa_url);
      }

      setCarregando(false);
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

    if (!TIPOS_IMAGEM_PERMITIDOS.includes(file.type)) {
      setAviso('Formato inválido. Use JPEG, PNG, WebP ou AVIF.');
      e.target.value = '';
      return;
    }

    if (file.size > TAMANHO_MAXIMO_BYTES) {
      setAviso('A imagem excede o limite de 5 MB.');
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

    if (!peca.nome.trim()) {
      setAviso('Informe o nome da peça.');
      e.currentTarget.elements.nome.focus();
      return;
    }

    const valorReais = Number(peca.preco.replace(',', '.'));
    if (!(valorReais > 0)) {
      setAviso('Informe um preço maior que zero.');
      e.currentTarget.elements.preco.focus();
      return;
    }

    if (demonstracao) {
      setAviso('Prévia validada. Os dados não foram salvos no modo demonstração.');
      return;
    }

    if (!supabase || !idPeca) {
      setAviso('Não foi possível identificar a peça ou conectar ao banco.');
      return;
    }

    if (!peca.categoria_id) {
      setAviso('Selecione uma categoria válida.');
      return;
    }

    setSalvando(true);
    setAviso('Salvando alterações...');

    try {
      let novaImagemUrl = imagemAtualUrl;

      // Só faz upload se o admin escolheu uma imagem nova
      if (fotoArquivo) {
        const extensao = fotoArquivo.name.split('.').pop();
        const nomeLimpo = fotoArquivo.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_');
        const caminhoArquivo = `${Date.now()}-${nomeLimpo}.${extensao}`;

        const { error: uploadError } = await supabase.storage
          .from('pecas')
          .upload(caminhoArquivo, fotoArquivo, {
            contentType: fotoArquivo.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Erro ao enviar nova imagem: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('pecas')
          .getPublicUrl(caminhoArquivo);

        novaImagemUrl = urlData.publicUrl;
      }

      const precoCentavos = Math.round(valorReais * 100);
      const estoqueAtual = parseInt(peca.estoque.replace(/\D/g, ''), 10) || 0;
      const prazoProducaoDias = parseInt(peca.prazo.replace(/\D/g, ''), 10) || 0;
      const tipoDisponibilidade = estoqueAtual > 0 ? 'pronta_entrega' : 'sob_encomenda';

      const { error: updateError } = await supabase
        .from('pecas')
        .update({
          nome: peca.nome.trim(),
          descricao: peca.descricao.trim() || null,
          preco_centavos: precoCentavos,
          categoria_id: peca.categoria_id,
          imagem_capa_url: novaImagemUrl,
          tipo_disponibilidade: tipoDisponibilidade,
          estoque_atual: estoqueAtual,
          prazo_producao_dias: prazoProducaoDias,
          visivel: peca.visivel,
        })
        .eq('id', idPeca);

      if (updateError) {
        throw new Error(`Erro ao atualizar peça: ${updateError.message}`);
      }

      // Se trocou a foto, registra também na tabela de galeria peca_imagens
      if (fotoArquivo && novaImagemUrl) {
        await supabase
          .from('peca_imagens')
          .insert({
            peca_id: idPeca,
            imagem_url: novaImagemUrl,
            ordem: 1,
          });

        setImagemAtualUrl(novaImagemUrl);
        setFotoArquivo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }

      setAviso('Alterações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      setAviso(err.message || 'Ocorreu um erro inesperado ao atualizar a peça.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (demonstracao || !supabase || !idPeca) return;

    const confirmou = window.confirm(
      `Tem certeza que deseja excluir "${peca.nome}"? Ela será removida do catálogo.`
    );
    if (!confirmou) return;

    setExcluindo(true);
    setAviso('Excluindo peça...');

    try {
      const { error } = await supabase
        .from('pecas')
        .update({
          arquivada: true,
          visivel: false,
        })
        .eq('id', idPeca);

      if (error) {
        throw new Error(`Erro ao excluir peça: ${error.message}`);
      }

      navigate(inicio);
    } catch (err) {
      console.error(err);
      setAviso(err.message || 'Não foi possível excluir a peça.');
      setExcluindo(false);
    }
  };

  const bloqueado = carregando || salvando || excluindo;

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
                  {categorias.length > 0 ? (
                    categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Maternidade">Maternidade</option>
                      <option value="Enxovais">Enxovais</option>
                      <option value="Crochê & Bordado">Crochê & Bordado</option>
                      <option value="Presentes">Presentes</option>
                    </>
                  )}
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

        <div className="acoes-rodape">
          <button
            type="button"
            className="btn-outline btn-excluir"
            onClick={handleExcluir}
            disabled={demonstracao || bloqueado || !idPeca}
          >
            {excluindo ? 'Excluindo...' : 'Excluir peça'}
          </button>
          <div className="acoes-direita">
            <Link className="btn-outline" to={inicio}>Cancelar</Link>
            <button
              type="submit"
              form="editar-peca-form"
              className="btn-salvar"
              disabled={bloqueado}
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
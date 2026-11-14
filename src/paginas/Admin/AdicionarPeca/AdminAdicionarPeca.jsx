import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../servicos/supabase';
import './AdminAdicionarPeca.css';

const TIPOS_IMAGEM_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB (limite configurado no bucket)

export const AdminAdicionarPeca = ({ demonstracao = false }) => {
  const fileInputRef = useRef(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoArquivo, setFotoArquivo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const inicio = demonstracao ? '/previa/admin' : '/admin';

  const [peca, setPeca] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria_id: '',
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
    async function carregarCategorias() {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('ativa', true)
        .order('ordem', { ascending: true });

      if (!ativo) return;

      if (error) {
        console.error('Erro ao carregar categorias:', error);
        setAviso('Não foi possível carregar as categorias do banco.');
        return;
      }

      if (data && data.length > 0) {
        setCategorias(data);
        setPeca((prev) => ({
          ...prev,
          categoria_id: prev.categoria_id || data[0].id,
        }));
      }
    }

    carregarCategorias();
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

    if (!supabase) {
      setAviso('Serviço do banco de dados não configurado.');
      return;
    }

    if (!peca.categoria_id) {
      setAviso('Selecione uma categoria válida.');
      return;
    }

    setSalvando(true);
    setAviso('Salvando peça...');

    try {
      let imagemCapaUrl = null;

      // 1. Faz upload da foto para o bucket 'pecas' (se houver foto selecionada)
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
          throw new Error(`Erro ao enviar imagem: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('pecas')
          .getPublicUrl(caminhoArquivo);

        imagemCapaUrl = urlData.publicUrl;
      }

      // 2. Prepara os valores numéricos conforme as colunas do PostgreSQL
      const precoCentavos = Math.round(valorReais * 100);
      const estoqueAtual = parseInt(peca.estoque.replace(/\D/g, ''), 10) || 0;
      const prazoProducaoDias = parseInt(peca.prazo.replace(/\D/g, ''), 10) || 0;
      const tipoDisponibilidade = estoqueAtual > 0 ? 'pronta_entrega' : 'sob_encomenda';

      // 3. Insere o registro principal na tabela 'pecas'
      const { data: novaPeca, error: pecaError } = await supabase
        .from('pecas')
        .insert({
          nome: peca.nome.trim(),
          descricao: peca.descricao.trim() || null,
          preco_centavos: precoCentavos,
          categoria_id: peca.categoria_id,
          imagem_capa_url: imagemCapaUrl,
          tipo_disponibilidade: tipoDisponibilidade,
          estoque_atual: estoqueAtual,
          prazo_producao_dias: prazoProducaoDias,
          visivel: peca.visivel,
          arquivada: false,
        })
        .select('id')
        .single();

      if (pecaError) {
        throw new Error(`Erro ao salvar peça: ${pecaError.message}`);
      }

      // 4. Registra a imagem na tabela 'peca_imagens' para manter o histórico da galeria
      if (imagemCapaUrl && novaPeca?.id) {
        const { error: imagemError } = await supabase
          .from('peca_imagens')
          .insert({
            peca_id: novaPeca.id,
            imagem_url: imagemCapaUrl,
            ordem: 1,
          });

        if (imagemError) {
          console.error('Peça salva, mas houve erro ao registrar em peca_imagens:', imagemError);
        }
      }

      limparFormulario();
      setAviso('Peça cadastrada com sucesso no catálogo!');
    } catch (err) {
      console.error(err);
      setAviso(err.message || 'Ocorreu um erro inesperado ao cadastrar a peça.');
    } finally {
      setSalvando(false);
    }
  };

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
                  disabled={salvando}
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
              disabled={salvando}
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
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './AdminEditarPeca.css';

export const AdminEditarPeca = ({ demonstracao = false }) => {
  // Referência para o input de ficheiro invisível
  const fileInputRef = useRef(null);

  // Estado para guardar a imagem selecionada e mostrá-la na tela
  const [fotoPreview, setFotoPreview] = useState(null);
  const [aviso, setAviso] = useState('');
  const inicio = demonstracao ? '/previa/admin' : '/admin';

  useEffect(() => () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
  }, [fotoPreview]);

  const [peca, setPeca] = useState({
    nome: demonstracao ? 'Kit de berço florido' : '',
    descricao: demonstracao ? 'Conjunto com manta, toalha e trocador em crochê com acabamento delicado.' : '',
    preco: demonstracao ? '189,00' : '',
    categoria: 'Maternidade',
    prazo: '7 dias úteis',
    estoque: '3 unidades',
    visivel: true,
  });

  const handleChange = (e) => {
    setAviso('');
    const { name, value, type, checked } = e.target;
    setPeca(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Função para abrir o seletor de arquivos/câmera
  const handleAbrirCameraOuGaleria = () => {
    fileInputRef.current.click();
  };

  // Função para capturar a foto selecionada e criar o preview
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setAviso('Selecione um arquivo de imagem.');
        e.target.value = '';
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setFotoPreview(imageUrl);
      setAviso('');
    }
  };

  const handleSalvar = (e) => {
    e.preventDefault();
    if (!peca.nome.trim()) {
      setAviso('Informe o nome da peça.');
      e.currentTarget.elements.nome.focus();
      return;
    }
    if (!(Number(peca.preco.replace(',', '.')) > 0)) {
      setAviso('Informe um preço maior que zero.');
      e.currentTarget.elements.preco.focus();
      return;
    }
    setAviso('Prévia validada. Os dados não foram salvos; a edição será conectada ao serviço da loja.');
  };

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
          Confira os dados da peça neste formulário.
        </p>
        <p className="aviso-demonstracao">{demonstracao ? 'Demonstração com uma peça fictícia: os campos e a foto são apenas uma prévia.' : 'A edição de peças ainda não está conectada ao serviço da loja.'} Nenhuma alteração será salva.</p>

        <form id="editar-peca-form" onSubmit={handleSalvar} className="form-grid">
          {/* Coluna da Esquerda: Foto */}
          <div className="coluna-foto">
            <button
              type="button"
              className="foto-placeholder"
              onClick={handleAbrirCameraOuGaleria}
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
            >
              Trocar foto
            </button>

            {/* Input invisível que faz a mágica acontecer */}
            <input
              type="file"
              aria-label="Selecionar foto da peça"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFotoChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Coluna da Direita: Dados da Peça */}
          <div className="coluna-dados">
            <div className="campo">
              <label htmlFor="editar-peca-nome">Nome da peça</label>
              <input id="editar-peca-nome" type="text" name="nome" value={peca.nome} onChange={handleChange} required />
            </div>

            <div className="campo">
              <label htmlFor="editar-peca-descricao">Descrição</label>
              <textarea id="editar-peca-descricao" name="descricao" rows="3" value={peca.descricao} onChange={handleChange} />
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label htmlFor="editar-peca-preco">Preço (R$)</label>
                <input id="editar-peca-preco" type="text" inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" name="preco" value={peca.preco} onChange={handleChange} required />
              </div>
              <div className="campo">
                <label htmlFor="editar-peca-categoria">Categoria</label>
                <select id="editar-peca-categoria" name="categoria" value={peca.categoria} onChange={handleChange}>
                  <option value="Maternidade">Maternidade</option>
                  <option value="Enxovais">Enxovais</option>
                  <option value="Crochê & Bordado">Crochê & Bordado</option>
                  <option value="Presentes">Presentes</option>
                </select>
              </div>
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label htmlFor="editar-peca-prazo">Prazo de entrega</label>
                <input id="editar-peca-prazo" type="text" name="prazo" value={peca.prazo} onChange={handleChange} />
              </div>
              <div className="campo">
                <label htmlFor="editar-peca-estoque">Estoque</label>
                <input id="editar-peca-estoque" type="text" name="estoque" value={peca.estoque} onChange={handleChange} />
              </div>
            </div>

            <div className="campo-toggle">
              <label className="toggle-label" htmlFor="editar-peca-visivel">
                <strong>Visível no catálogo</strong>
                <div className="toggle-switch">
                  <input id="editar-peca-visivel" type="checkbox" name="visivel" checked={peca.visivel} onChange={handleChange} />
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
            <button type="submit" form="editar-peca-form" className="btn-salvar">
              Validar prévia
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminEditarPeca;

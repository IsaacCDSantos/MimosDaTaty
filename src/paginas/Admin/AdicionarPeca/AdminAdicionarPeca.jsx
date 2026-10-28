import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './AdminAdicionarPeca.css';

export const AdminAdicionarPeca = ({ demonstracao = false }) => {
  const fileInputRef = useRef(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [aviso, setAviso] = useState('');
  const inicio = demonstracao ? '/previa/admin' : '/admin';

  useEffect(() => () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
  }, [fotoPreview]);

  // Estado inicial com os campos vazios (ou valores padrão) para uma NOVA peça
  const [peca, setPeca] = useState({
    nome: '',
    descricao: '',
    preco: '',
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

  const handleAbrirCameraOuGaleria = () => {
    fileInputRef.current.click();
  };

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
    setAviso('Prévia validada. Os dados não foram salvos; o cadastro será conectado ao serviço da loja.');
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

        {/* Título alterado para "Adicionar" conforme a imagem */}
        <h1 className="titulo-editar">Adicionar</h1>
        <p className="subtitulo-editar">
          Para adicionar uma peça nova, preencha este formulário.
        </p>
        <p className="aviso-demonstracao">{demonstracao ? 'Demonstração: os campos e a foto são apenas uma prévia.' : 'O cadastro de peças ainda não está conectado ao serviço da loja.'} Nenhuma peça será salva.</p>

        <form id="adicionar-peca-form" onSubmit={handleSalvar} className="form-grid">
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
              Adicionar foto
            </button>

            <input
              type="file"
              aria-label="Selecionar foto da peça"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFotoChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="coluna-dados">
            <div className="campo">
              <label htmlFor="adicionar-peca-nome">Nome da peça</label>
              <input id="adicionar-peca-nome" type="text" name="nome" value={peca.nome} onChange={handleChange} placeholder="Ex: Kit de berço florido" required />
            </div>

            <div className="campo">
              <label htmlFor="adicionar-peca-descricao">Descrição</label>
              <textarea id="adicionar-peca-descricao" name="descricao" rows="3" value={peca.descricao} onChange={handleChange} placeholder="Detalhes da peça..." />
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label htmlFor="adicionar-peca-preco">Preço (R$)</label>
                <input id="adicionar-peca-preco" type="text" inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" name="preco" value={peca.preco} onChange={handleChange} placeholder="0,00" required />
              </div>
              <div className="campo">
                <label htmlFor="adicionar-peca-categoria">Categoria</label>
                <select id="adicionar-peca-categoria" name="categoria" value={peca.categoria} onChange={handleChange}>
                  <option value="Maternidade">Maternidade</option>
                  <option value="Enxovais">Enxovais</option>
                  <option value="Crochê & Bordado">Crochê & Bordado</option>
                  <option value="Presentes">Presentes</option>
                </select>
              </div>
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label htmlFor="adicionar-peca-prazo">Prazo de entrega</label>
                <input id="adicionar-peca-prazo" type="text" name="prazo" value={peca.prazo} onChange={handleChange} />
              </div>
              <div className="campo">
                <label htmlFor="adicionar-peca-estoque">Estoque</label>
                <input id="adicionar-peca-estoque" type="text" name="estoque" value={peca.estoque} onChange={handleChange} />
              </div>
            </div>

            <div className="campo-toggle">
              <label className="toggle-label" htmlFor="adicionar-peca-visivel">
                <strong>Visível no catálogo</strong>
                <div className="toggle-switch">
                  <input id="adicionar-peca-visivel" type="checkbox" name="visivel" checked={peca.visivel} onChange={handleChange} />
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
            <button type="submit" form="adicionar-peca-form" className="btn-salvar">
              Validar prévia
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAdicionarPeca;

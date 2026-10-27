import React, { useState, useRef } from 'react';
import './AdminAdicionarPeca.css';

export const AdminAdicionarPeca = () => {
  const fileInputRef = useRef(null);
  const [fotoPreview, setFotoPreview] = useState(null);

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
      const imageUrl = URL.createObjectURL(file);
      setFotoPreview(imageUrl);
    }
  };

  const handleSalvar = (e) => {
    e.preventDefault();
    console.log('Nova peça adicionada:', peca, 'Foto:', fotoPreview ? 'Foto selecionada' : 'Sem foto');
    alert('Nova peça adicionada ao catálogo com sucesso!');
  };

  return (
    <div className="admin-page-bg">
      <nav className="admin-nav">
        <div className="nav-links">
          <button className="nav-btn">Home</button>
          <button className="nav-btn ativo">Catálogo</button>
          <button className="nav-btn">Pedidos</button>
        </div>
        <div className="nav-user">
          <button className="nav-btn-user">Admin: Tati</button>
        </div>
      </nav>

      <main className="form-card">
        <button className="btn-voltar">← Voltar ao catálogo</button>
        
        {/* Título alterado para "Adicionar" conforme a imagem */}
        <h1 className="titulo-editar">Adicionar</h1>
        <p className="subtitulo-editar">
          Para adicionar uma peça nova, preencha este formulário.
        </p>

        <form onSubmit={handleSalvar} className="form-grid">
          <div className="coluna-foto">
            <div 
              className="foto-placeholder" 
              onClick={handleAbrirCameraOuGaleria}
              style={{ cursor: 'pointer' }}
            >
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview da peça" className="foto-preview-img" />
              ) : (
                <span>Foto da peça</span>
              )}
            </div>
            
            <button 
              type="button" 
              className="btn-outline" 
              onClick={handleAbrirCameraOuGaleria}
            >
              Adicionar foto
            </button>

            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFotoChange} 
              style={{ display: 'none' }} 
            />
          </div>

          <div className="coluna-dados">
            <div className="campo">
              <label>Nome da peça</label>
              <input type="text" name="nome" value={peca.nome} onChange={handleChange} placeholder="Ex: Kit de berço florido" />
            </div>

            <div className="campo">
              <label>Descrição</label>
              <textarea name="descricao" rows="3" value={peca.descricao} onChange={handleChange} placeholder="Detalhes da peça..." />
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label>Preço (R$)</label>
                <input type="text" name="preco" value={peca.preco} onChange={handleChange} placeholder="0,00" />
              </div>
              <div className="campo">
                <label>Categoria</label>
                <select name="categoria" value={peca.categoria} onChange={handleChange}>
                  <option value="Maternidade">Maternidade</option>
                  <option value="Enxovais">Enxovais</option>
                  <option value="Crochê & Bordado">Crochê & Bordado</option>
                  <option value="Presentes">Presentes</option>
                </select>
              </div>
            </div>

            <div className="linha-dupla">
              <div className="campo">
                <label>Prazo de entrega</label>
                <input type="text" name="prazo" value={peca.prazo} onChange={handleChange} />
              </div>
              <div className="campo">
                <label>Estoque</label>
                <input type="text" name="estoque" value={peca.estoque} onChange={handleChange} />
              </div>
            </div>

            <div className="campo-toggle">
              <label className="toggle-label">
                <strong>Visível no catálogo</strong>
                <div className="toggle-switch">
                  <input type="checkbox" name="visivel" checked={peca.visivel} onChange={handleChange} />
                  <span className="slider"></span>
                </div>
              </label>
            </div>
          </div>
        </form>

        <div className="acoes-rodape">
          {/* Botão de excluir pode ser ocultado na tela de adicionar, mas mantive para ficar igual ao protótipo */}
          <button type="button" className="btn-outline btn-excluir" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            Excluir peça
          </button>
          <div className="acoes-direita">
            <button type="button" className="btn-outline">Cancelar</button>
            <button type="button" className="btn-salvar" onClick={handleSalvar}>
              Salvar alterações
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAdicionarPeca;
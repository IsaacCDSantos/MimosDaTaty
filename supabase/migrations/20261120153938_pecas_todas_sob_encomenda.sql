-- O ateliê trabalha só sob encomenda: nenhuma peça é limitada pelo estoque.
-- O admin passa a salvar sempre "sob_encomenda"; aqui as peças antigas acompanham.
update public.pecas set tipo_disponibilidade = 'sob_encomenda' where tipo_disponibilidade <> 'sob_encomenda';

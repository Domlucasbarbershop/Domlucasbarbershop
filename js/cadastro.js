document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth(['admin']);
  if (!user) return;

  await window.CommonUI.setupLayout(user);

  const info = document.getElementById('cadastro-info');
  const listUsuarios = document.getElementById('lista-usuarios');
  const usuarioSubtabButtons = document.querySelectorAll('[data-usuario-subtab]');
  const subtabInfo = document.getElementById('usuarios-subtab-info');
  const listServicos = document.getElementById('lista-servicos');
  const formServico = document.getElementById('form-servico');
  const inputNome = document.getElementById('servico-nome');
  const inputPreco = document.getElementById('servico-preco');
  const inputDuracao = document.getElementById('servico-duracao');
  const formCategoriaDespesa = document.getElementById('form-categoria-despesa');
  const listCategoriasDespesa = document.getElementById('lista-categorias-despesa');
  const categoriaDespesaNome = document.getElementById('categoria-despesa-nome');
  const tabButtons = document.querySelectorAll('[data-cadastro-tab]');
  const panelUsuarios = document.getElementById('cadastro-panel-usuarios');
  const panelServicos = document.getElementById('cadastro-panel-servicos');
  const panelDespesas = document.getElementById('cadastro-panel-despesas');
  let usuariosCache = [];
  let usuarioSubtabAtiva = 'usuarios';

  function setTab(tab) {
    tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.cadastroTab === tab));
    panelUsuarios.classList.toggle('active', tab === 'usuarios');
    panelServicos.classList.toggle('active', tab === 'servicos');
    panelDespesas.classList.toggle('active', tab === 'despesas');
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.cadastroTab));
  });

  function parsePreco(v) {
    return Number(String(v).replace(',', '.'));
  }

  function setUsuarioSubtab(tab) {
    usuarioSubtabAtiva = tab;
    usuarioSubtabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.usuarioSubtab === tab));
    const textMap = {
      usuarios: 'Exibindo usuarios clientes.',
      barbeiros: 'Exibindo apenas barbeiros.',
      admin: 'Exibindo apenas administradores.'
    };
    if (subtabInfo) subtabInfo.textContent = textMap[tab] || '';
    renderUsuarios();
  }

  usuarioSubtabButtons.forEach((btn) => {
    btn.addEventListener('click', () => setUsuarioSubtab(btn.dataset.usuarioSubtab));
  });

  async function refreshCategoriasDespesa() {
    const { data, error } = await window.sb
      .from('categorias_despesa')
      .select('id, nome')
      .order('nome', { ascending: true })
      .limit(150);
    if (error) throw error;

    listCategoriasDespesa.innerHTML = (data || []).map((d) => `
      <tr>
        <td>${d.nome || '-'}</td>
        <td>
          <button type="button" class="btn-secondary" data-action="editar-categoria-despesa" data-id="${d.id}" data-nome="${d.nome || ''}">Editar</button>
          <button type="button" class="btn-danger" data-action="excluir-categoria-despesa" data-id="${d.id}">Excluir</button>
        </td>
      </tr>
    `).join('');
  }

  async function refreshServicos() {
    const { data, error } = await window.sb
      .from('servicos')
      .select('id, nome, preco, duracao_minutos')
      .order('nome', { ascending: true });

    if (error) throw error;

    listServicos.innerHTML = (data || []).map((s) => `
      <tr>
        <td>${s.nome || '-'}</td>
        <td>${window.AppUtils.formatMoney(s.preco || 0)}</td>
        <td>${s.duracao_minutos || 0} min</td>
        <td>
          <button type="button" class="btn-secondary" data-action="editar-servico" data-id="${s.id}" data-nome="${s.nome || ''}" data-preco="${s.preco || 0}" data-duracao="${s.duracao_minutos || 0}">Editar</button>
          <button type="button" class="btn-danger" data-action="excluir-servico" data-id="${s.id}">Excluir</button>
        </td>
      </tr>
    `).join('');
  }

  function renderUsuarios() {
    let rows = usuariosCache;
    if (usuarioSubtabAtiva === 'usuarios') rows = usuariosCache.filter((u) => u.perfil === 'cliente');
    if (usuarioSubtabAtiva === 'barbeiros') rows = usuariosCache.filter((u) => u.perfil === 'barbeiro');
    if (usuarioSubtabAtiva === 'admin') rows = usuariosCache.filter((u) => u.perfil === 'admin');

    listUsuarios.innerHTML = rows.map((u) => `
      <tr>
        <td>${u.nome || '-'}</td>
        <td>${u.email || '-'}</td>
        <td>${u.perfil || '-'}</td>
        <td>${u.perfil === 'barbeiro' ? `${Number(u.comissao_percentual || 0).toFixed(2)}%` : '-'}</td>
        <td>${u.ativo ? 'Sim' : 'Nao'}</td>
        <td>
          ${u.perfil === 'admin'
            ? '<span class="muted">Administrador</span>'
            : u.perfil === 'barbeiro'
              ? `<div class="rowBetween">
                  <span class="muted">Ja e barbeiro</span>
                  <button type="button" class="btn-secondary" data-action="editar-comissao" data-id="${u.id}" data-nome="${u.nome || ''}" data-comissao="${Number(u.comissao_percentual || 0)}">Editar comissao</button>
                  <button type="button" class="btn-danger" data-action="tornar-cliente" data-id="${u.id}" data-nome="${u.nome || ''}">Tornar cliente</button>
                </div>`
              : `<button type="button" class="btn-secondary" data-action="tornar-barbeiro" data-id="${u.id}" data-nome="${u.nome || ''}">Definir como barbeiro</button>`}
        </td>
      </tr>
    `).join('');
  }

  async function refresh() {
    try {
      const { data, error } = await window.sb
        .from('usuarios')
        .select('id, nome, email, perfil, ativo')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const usuarios = data || [];
      const usuarioIds = usuarios.map((u) => u.id);

      let barbeirosMap = new Map();
      if (usuarioIds.length > 0) {
        const { data: barbeirosData, error: barbeirosError } = await window.sb
          .from('barbeiros')
          .select('usuario_id, comissao_percentual')
          .in('usuario_id', usuarioIds);
        if (barbeirosError) throw barbeirosError;
        barbeirosMap = new Map((barbeirosData || []).map((b) => [String(b.usuario_id), Number(b.comissao_percentual || 0)]));
      }

      usuariosCache = usuarios.map((u) => ({
        ...u,
        comissao_percentual: barbeirosMap.get(String(u.id)) ?? null
      }));
      renderUsuarios();

      await refreshServicos();
      await refreshCategoriasDespesa();
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  }

  listUsuarios.addEventListener('click', async (ev) => {
    const btnCliente = ev.target.closest('button[data-action="tornar-cliente"]');
    if (btnCliente) {
      const ok = window.confirm(`Deseja remover ${btnCliente.dataset.nome || 'este usuario'} da funcao de barbeiro e voltar para cliente?`);
      if (!ok) return;

      try {
        const { error } = await window.sb.rpc('definir_usuario_como_cliente', {
          p_usuario_id: btnCliente.dataset.id
        });
        if (error) throw error;
        window.AppUtils.notify(info, 'Usuario definido como cliente com sucesso.');
        await refresh();
      } catch (err) {
        window.AppUtils.notify(info, err.message, true);
      }
      return;
    }

    const btn = ev.target.closest('button[data-action="tornar-barbeiro"]');
    const btnEditComissao = ev.target.closest('button[data-action="editar-comissao"]');

    if (btnEditComissao) {
      const comissaoAtual = String(btnEditComissao.dataset.comissao || '40');
      const novoValorStr = window.prompt('Nova comissao percentual (0 a 100):', comissaoAtual);
      if (novoValorStr === null) return;
      const novoValor = Number(novoValorStr);
      if (!Number.isFinite(novoValor) || novoValor < 0 || novoValor > 100) {
        window.AppUtils.notify(info, 'Comissao invalida. Informe um numero entre 0 e 100.', true);
        return;
      }

      try {
        const { error } = await window.sb
          .from('barbeiros')
          .update({ comissao_percentual: novoValor })
          .eq('usuario_id', btnEditComissao.dataset.id);
        if (error) throw error;
        window.AppUtils.notify(info, 'Comissao atualizada com sucesso.');
        await refresh();
      } catch (err) {
        window.AppUtils.notify(info, err.message, true);
      }
      return;
    }

    if (!btn) return;

    const nomePadrao = btn.dataset.nome || 'Barbeiro';
    const comissaoStr = window.prompt('Comissao percentual do barbeiro (0 a 100):', '40');
    if (comissaoStr === null) return;
    const comissao = Number(comissaoStr);
    if (!Number.isFinite(comissao) || comissao < 0 || comissao > 100) {
      window.AppUtils.notify(info, 'Comissao invalida. Informe um numero entre 0 e 100.', true);
      return;
    }

    try {
      const { error } = await window.sb.rpc('definir_usuario_como_barbeiro', {
        p_usuario_id: btn.dataset.id,
        p_nome: nomePadrao,
        p_telefone: null,
        p_comissao: comissao
      });
      if (error) throw error;

      window.AppUtils.notify(info, 'Usuario definido como barbeiro com sucesso.');
      await refresh();
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  formServico.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const nome = String(inputNome.value || '').trim();
    const preco = parsePreco(inputPreco.value);
    const duracao = Number(inputDuracao.value);

    if (!nome) {
      window.AppUtils.notify(info, 'Informe o nome do servico.', true);
      return;
    }
    if (!Number.isFinite(preco) || preco < 0) {
      window.AppUtils.notify(info, 'Preco invalido.', true);
      return;
    }
    if (!Number.isFinite(duracao) || duracao <= 0) {
      window.AppUtils.notify(info, 'Duracao invalida.', true);
      return;
    }

    try {
      const { error } = await window.sb.from('servicos').insert({
        nome,
        preco,
        duracao_minutos: Math.round(duracao)
      });
      if (error) throw error;

      formServico.reset();
      window.AppUtils.notify(info, 'Servico cadastrado com sucesso.');
      await refreshServicos();
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  listServicos.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;

    const servicoId = btn.dataset.id;
    const action = btn.dataset.action;

    try {
      if (action === 'excluir-servico') {
        const ok = window.confirm('Deseja excluir este servico?');
        if (!ok) return;
        const { error } = await window.sb.from('servicos').delete().eq('id', servicoId);
        if (error) throw error;
        window.AppUtils.notify(info, 'Servico excluido com sucesso.');
        await refreshServicos();
        return;
      }

      if (action === 'editar-servico') {
        const nomeAtual = btn.dataset.nome || '';
        const precoAtual = String(btn.dataset.preco || '0');
        const duracaoAtual = String(btn.dataset.duracao || '30');

        const nome = window.prompt('Nome do servico:', nomeAtual);
        if (nome === null) return;
        const precoStr = window.prompt('Preco (R$):', precoAtual);
        if (precoStr === null) return;
        const duracaoStr = window.prompt('Duracao (minutos):', duracaoAtual);
        if (duracaoStr === null) return;

        const preco = parsePreco(precoStr);
        const duracao = Number(duracaoStr);
        if (!String(nome).trim()) {
          window.AppUtils.notify(info, 'Nome invalido.', true);
          return;
        }
        if (!Number.isFinite(preco) || preco < 0) {
          window.AppUtils.notify(info, 'Preco invalido.', true);
          return;
        }
        if (!Number.isFinite(duracao) || duracao <= 0) {
          window.AppUtils.notify(info, 'Duracao invalida.', true);
          return;
        }

        const { error } = await window.sb
          .from('servicos')
          .update({
            nome: String(nome).trim(),
            preco,
            duracao_minutos: Math.round(duracao)
          })
          .eq('id', servicoId);
        if (error) throw error;
        window.AppUtils.notify(info, 'Servico atualizado com sucesso.');
        await refreshServicos();
      }
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  formCategoriaDespesa.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const nome = String(categoriaDespesaNome.value || '').trim();

    if (!nome) {
      window.AppUtils.notify(info, 'Informe o nome da categoria de despesa.', true);
      return;
    }

    try {
      const { error } = await window.sb.from('categorias_despesa').insert({
        nome
      });
      if (error) throw error;

      formCategoriaDespesa.reset();
      window.AppUtils.notify(info, 'Categoria de despesa cadastrada com sucesso.');
      await refreshCategoriasDespesa();
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  listCategoriasDespesa.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    try {
      if (action === 'excluir-categoria-despesa') {
        const ok = window.confirm('Deseja excluir esta categoria de despesa?');
        if (!ok) return;
        const { error } = await window.sb.from('categorias_despesa').delete().eq('id', id);
        if (error) throw error;
        window.AppUtils.notify(info, 'Categoria excluida com sucesso.');
        await refreshCategoriasDespesa();
        return;
      }

      if (action === 'editar-categoria-despesa') {
        const nome = window.prompt('Categoria:', btn.dataset.nome || '');
        if (nome === null) return;

        if (!String(nome).trim()) {
          window.AppUtils.notify(info, 'Categoria invalida.', true);
          return;
        }

        const { error } = await window.sb
          .from('categorias_despesa')
          .update({
            nome: String(nome).trim()
          })
          .eq('id', id);
        if (error) throw error;
        window.AppUtils.notify(info, 'Categoria atualizada com sucesso.');
        await refreshCategoriasDespesa();
      }
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  setUsuarioSubtab('usuarios');
  await refresh();
});

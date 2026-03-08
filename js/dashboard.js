document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth(['admin']);
  if (!user) return;

  await window.CommonUI.setupLayout(user);
  await window.Api.runAutoCompletion();

  const info = document.getElementById('dashboard-info');
  const periodoSelect = document.getElementById('dashboard-periodo');

  const cards = {
    totalFaturado: document.getElementById('total-faturado-hoje'),
    atendimentos: document.getElementById('atendimentos-hoje'),
    agendamentos: document.getElementById('agendamentos-hoje'),
    topBarbeiro: document.getElementById('top-barbeiro-hoje'),
    contasReceber: document.getElementById('dashboard-contas-receber'),
    despesasHoje: document.getElementById('dashboard-despesas-hoje'),
    comissoesHoje: document.getElementById('dashboard-comissoes-hoje'),
    liquidoHoje: document.getElementById('dashboard-liquido-hoje')
  };

  const listProximos = document.getElementById('dashboard-proximos');
  const listContas = document.getElementById('dashboard-contas-lista');

  function periodBounds(tipo) {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    if (tipo === 'semana') {
      inicio.setDate(inicio.getDate() - inicio.getDay());
    } else if (tipo === 'mes') {
      inicio.setDate(1);
    }

    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    if (tipo === 'semana') {
      fim.setDate(inicio.getDate() + 6);
    } else if (tipo === 'mes') {
      fim.setMonth(inicio.getMonth() + 1);
      fim.setDate(0);
    }

    return {
      inicio: inicio.toISOString().slice(0, 10),
      fim: fim.toISOString().slice(0, 10)
    };
  }

  async function loadDashboard() {
    const periodo = periodoSelect.value || 'hoje';
    const { inicio, fim } = periodBounds(periodo);

    const [agRes, finRes, despRes, contasManuaisRes] = await Promise.all([
      window.sb
        .from('agendamentos')
        .select('data, hora_inicio, status, valor, clientes(nome), barbeiros(nome), servicos(nome)')
        .gte('data', inicio)
        .lte('data', fim)
        .order('data', { ascending: true })
        .order('hora_inicio', { ascending: true }),
      window.sb
        .from('financeiro')
        .select('data, valor_servico, comissao_barbeiro, status_pagamento, barbeiros(nome), agendamentos(clientes(nome), servicos(nome))')
        .gte('data', inicio)
        .lte('data', fim),
      window.sb
        .from('despesas')
        .select('data, descricao, valor')
        .gte('data', inicio)
        .lte('data', fim),
      window.sb
        .from('contas_receber_manuais')
        .select('id, data, descricao, valor, status')
        .eq('status', 'pendente')
        .gte('data', inicio)
        .lte('data', fim)
    ]);

    if (agRes.error) throw agRes.error;
    if (finRes.error) throw finRes.error;
    if (despRes.error) throw despRes.error;

    const agRows = agRes.data || [];
    const finRows = finRes.data || [];
    const despRows = despRes.data || [];

    const finPagos = finRows.filter((r) => r.status_pagamento === 'pago');
    const finPendentes = finRows.filter((r) => r.status_pagamento === 'pendente');

    const totalFaturado = finPagos.reduce((acc, r) => acc + Number(r.valor_servico || 0), 0);
    const totalComissoes = finPagos.reduce((acc, r) => acc + Number(r.comissao_barbeiro || 0), 0);
    const totalDespesas = despRows.reduce((acc, r) => acc + Number(r.valor || 0), 0);
    const totalLiquido = totalFaturado - totalComissoes - totalDespesas;

    const atendimentosConcluidos = agRows.filter((a) => a.status === 'concluido').length;
    const agendamentosPeriodo = agRows.length;

    const porBarbeiro = {};
    finPagos.forEach((row) => {
      const nome = row.barbeiros?.nome || 'Sem nome';
      porBarbeiro[nome] = (porBarbeiro[nome] || 0) + Number(row.valor_servico || 0);
    });
    const top = Object.entries(porBarbeiro).sort((a, b) => b[1] - a[1])[0];

    const contasManuais = contasManuaisRes.error ? [] : (contasManuaisRes.data || []);
    const totalContas = finPendentes.reduce((acc, r) => acc + Number(r.valor_servico || 0), 0)
      + contasManuais.reduce((acc, r) => acc + Number(r.valor || 0), 0);

    cards.totalFaturado.textContent = window.AppUtils.formatMoney(totalFaturado);
    cards.atendimentos.textContent = String(atendimentosConcluidos);
    cards.agendamentos.textContent = String(agendamentosPeriodo);
    cards.topBarbeiro.textContent = top ? `${top[0]} (${window.AppUtils.formatMoney(top[1])})` : 'Sem dados';
    cards.contasReceber.textContent = window.AppUtils.formatMoney(totalContas);
    cards.despesasHoje.textContent = window.AppUtils.formatMoney(totalDespesas);
    cards.comissoesHoje.textContent = window.AppUtils.formatMoney(totalComissoes);
    cards.liquidoHoje.textContent = window.AppUtils.formatMoney(totalLiquido);

    const proximos = agRows
      .filter((a) => a.status === 'agendado' || a.status === 'em_atendimento')
      .slice(0, 12);

    listProximos.innerHTML = proximos.length
      ? proximos.map((a) => `
          <tr>
            <td>${window.AppUtils.formatDate(a.data)}</td>
            <td>${String(a.hora_inicio || '').slice(0, 5)}</td>
            <td>${a.clientes?.nome || '-'}</td>
            <td>${a.barbeiros?.nome || '-'}</td>
            <td>${a.servicos?.nome || '-'}</td>
            <td><span class="badge ${a.status}">${a.status}</span></td>
          </tr>
        `).join('')
      : '<tr><td colspan="6">Sem agendamentos no periodo.</td></tr>';

    const contasServicos = finPendentes.slice(0, 12).map((r) => ({
      origem: 'Servico',
      data: r.data,
      descricao: r.agendamentos?.clientes?.nome || r.agendamentos?.servicos?.nome || '-',
      valor: Number(r.valor_servico || 0),
      status: 'pendente'
    }));

    const contasRows = [
      ...contasServicos,
      ...contasManuais.map((r) => ({
        origem: 'Manual',
        data: r.data,
        descricao: r.descricao || '-',
        valor: Number(r.valor || 0),
        status: r.status || 'pendente'
      }))
    ]
      .sort((a, b) => String(b.data).localeCompare(String(a.data)))
      .slice(0, 12);

    listContas.innerHTML = contasRows.length
      ? contasRows.map((c) => `
          <tr>
            <td>${c.origem}</td>
            <td>${window.AppUtils.formatDate(c.data)}</td>
            <td>${c.descricao}</td>
            <td>${window.AppUtils.formatMoney(c.valor)}</td>
            <td><span class="badge pendente">${c.status}</span></td>
          </tr>
        `).join('')
      : '<tr><td colspan="5">Sem contas a receber.</td></tr>';
  }

  periodoSelect.addEventListener('change', () => {
    loadDashboard().catch((err) => {
      info.textContent = err.message;
    });
  });

  try {
    await loadDashboard();
  } catch (err) {
    info.textContent = err.message;
  }
});
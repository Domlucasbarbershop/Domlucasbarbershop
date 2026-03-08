document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth(['barbeiro']);
  if (!user) return;

  await window.CommonUI.setupLayout(user);
  await window.Api.runAutoCompletion();

  const info = document.getElementById('barbeiro-info');
  const agendaDataInput = document.getElementById('agenda-data-barbeiro');
  const agendaBody = document.getElementById('lista-agenda-barbeiro');
  const historicoBody = document.getElementById('historico-barbeiro-body');

  agendaDataInput.value = window.AppUtils.todayISO();

  async function getMeuBarbeiroId() {
    const { data, error } = await window.sb
      .from('barbeiros')
      .select('id')
      .eq('usuario_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data?.id || null;
  }

  async function loadResumoDia(barbeiroId) {
    if (!barbeiroId) {
      document.getElementById('card-atendimentos-hoje').textContent = '0';
      document.getElementById('card-faturado-hoje').textContent = window.AppUtils.formatMoney(0);
      document.getElementById('card-comissao-hoje').textContent = window.AppUtils.formatMoney(0);
      document.getElementById('card-proximos-clientes').textContent = 'Sem proximos clientes.';
      return;
    }
    const hoje = window.AppUtils.todayISO();
    const [agRes, comRes] = await Promise.all([
      window.sb
        .from('agendamentos')
        .select('id, data, hora_inicio, status, valor, clientes(nome)')
        .eq('barbeiro_id', barbeiroId)
        .eq('data', hoje)
        .order('hora_inicio', { ascending: true }),
      window.sb
        .from('comissoes')
        .select('valor_comissao, data')
        .eq('barbeiro_id', barbeiroId)
        .eq('data', hoje)
    ]);
    if (agRes.error) throw agRes.error;
    if (comRes.error) throw comRes.error;

    const rows = agRes.data || [];
    const comRows = comRes.data || [];
    const agora = new Date();

    const atendimentosDia = rows.filter((r) => r.status !== 'cancelado').length;
    const faturadoDia = rows
      .filter((r) => r.status === 'concluido')
      .reduce((acc, r) => acc + Number(r.valor || 0), 0);
    const comissaoDia = comRows.reduce((acc, r) => acc + Number(r.valor_comissao || 0), 0);

    const proximos = rows
      .filter((r) => r.status === 'agendado' || r.status === 'em_atendimento')
      .filter((r) => new Date(`${r.data}T${r.hora_inicio}`) >= agora)
      .slice(0, 4);

    document.getElementById('card-atendimentos-hoje').textContent = String(atendimentosDia);
    document.getElementById('card-faturado-hoje').textContent = window.AppUtils.formatMoney(faturadoDia);
    document.getElementById('card-comissao-hoje').textContent = window.AppUtils.formatMoney(comissaoDia);
    document.getElementById('card-proximos-clientes').innerHTML = proximos.length === 0
      ? 'Sem proximos clientes.'
      : proximos.map((p) => `${String(p.hora_inicio).slice(0, 5)} - ${p.clientes?.nome || '-'}`).join('<br/>');
  }

  async function loadAgendaDia(barbeiroId) {
    if (!barbeiroId) {
      agendaBody.innerHTML = '<tr><td colspan="6">Nenhum agendamento.</td></tr>';
      return;
    }
    const data = agendaDataInput.value;
    const { data: rows, error } = await window.sb
      .from('agendamentos')
      .select('id, hora_inicio, hora_fim, status, pagamento_pendente, clientes(nome), servicos(nome)')
      .eq('barbeiro_id', barbeiroId)
      .eq('data', data)
      .order('hora_inicio', { ascending: true });
    if (error) throw error;

    agendaBody.innerHTML = (rows || []).map((r) => `
      <tr>
        <td>${String(r.hora_inicio).slice(0, 5)} - ${String(r.hora_fim).slice(0, 5)}</td>
        <td>${r.clientes?.nome || '-'}</td>
        <td>${r.servicos?.nome || '-'}</td>
        <td><span class="badge ${r.status}">${r.status}</span></td>
        <td><span class="badge ${r.pagamento_pendente ? 'pendente' : 'pago'}">${r.pagamento_pendente ? 'pendente' : 'pago'}</span></td>
      </tr>
    `).join('');
  }

  async function loadHistorico(barbeiroId) {
    if (!barbeiroId) {
      historicoBody.innerHTML = '<tr><td colspan="6">Sem historico.</td></tr>';
      return;
    }
    const { data: rows, error } = await window.sb
      .from('agendamentos')
      .select('data, valor, pagamento_pendente, clientes(nome), servicos(nome)')
      .eq('barbeiro_id', barbeiroId)
      .eq('status', 'concluido')
      .order('data', { ascending: false })
      .limit(120);
    if (error) throw error;

    historicoBody.innerHTML = (rows || []).length === 0
      ? '<tr><td colspan="6">Sem historico.</td></tr>'
      : rows.map((r) => `
        <tr>
          <td>${r.clientes?.nome || '-'}</td>
          <td>${r.servicos?.nome || '-'}</td>
          <td>${window.AppUtils.formatMoney(r.valor)}</td>
          <td>${window.AppUtils.formatDate(r.data)}</td>
          <td>-</td>
          <td><span class="badge ${r.pagamento_pendente ? 'pendente' : 'pago'}">${r.pagamento_pendente ? 'pendente' : 'pago'}</span></td>
        </tr>
      `).join('');
  }

  async function refreshAll(barbeiroId) {
    await Promise.all([
      loadResumoDia(barbeiroId),
      loadAgendaDia(barbeiroId),
      loadHistorico(barbeiroId)
    ]);
  }

  let barbeiroId = null;

  agendaDataInput.addEventListener('change', async () => {
    try {
      await loadAgendaDia(barbeiroId);
      await loadResumoDia(barbeiroId);
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  try {
    barbeiroId = await getMeuBarbeiroId();
    await refreshAll(barbeiroId);
    if (!barbeiroId) {
      window.AppUtils.notify(info, 'Nao foi possivel localizar barbeiro para este usuario.', true);
    }
  } catch (err) {
    window.AppUtils.notify(info, err.message, true);
  }
});

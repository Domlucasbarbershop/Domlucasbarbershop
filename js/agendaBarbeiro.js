document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth(['barbeiro']);
  if (!user) return;

  await window.CommonUI.setupLayout(user);
  await window.Api.runAutoCompletion();

  const info = document.getElementById('agenda-barbeiro-info');
  const agendaDataInput = document.getElementById('agenda-data-barbeiro');
  const agendaBody = document.getElementById('lista-agenda-barbeiro');

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

  async function loadAgendaDia(barbeiroId) {
    if (!barbeiroId) {
      agendaBody.innerHTML = '<tr><td colspan="5">Nenhum agendamento.</td></tr>';
      return;
    }
    const data = agendaDataInput.value;
    const { data: rows, error } = await window.sb
      .from('agendamentos')
      .select('hora_inicio, hora_fim, status, pagamento_pendente, clientes(nome), servicos(nome)')
      .eq('barbeiro_id', barbeiroId)
      .eq('data', data)
      .order('hora_inicio', { ascending: true });
    if (error) throw error;

    agendaBody.innerHTML = (rows || []).length === 0
      ? '<tr><td colspan="5">Sem agendamentos para a data selecionada.</td></tr>'
      : rows.map((r) => `
          <tr>
            <td>${String(r.hora_inicio).slice(0, 5)} - ${String(r.hora_fim).slice(0, 5)}</td>
            <td>${r.clientes?.nome || '-'}</td>
            <td>${r.servicos?.nome || '-'}</td>
            <td><span class="badge ${r.status}">${r.status}</span></td>
            <td><span class="badge ${r.pagamento_pendente ? 'pendente' : 'pago'}">${r.pagamento_pendente ? 'pendente' : 'pago'}</span></td>
          </tr>
        `).join('');
  }

  let barbeiroId = null;

  agendaDataInput.addEventListener('change', async () => {
    try {
      await loadAgendaDia(barbeiroId);
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  try {
    barbeiroId = await getMeuBarbeiroId();
    await loadAgendaDia(barbeiroId);
    if (!barbeiroId) {
      window.AppUtils.notify(info, 'Nao foi possivel localizar barbeiro para este usuario.', true);
    }
  } catch (err) {
    window.AppUtils.notify(info, err.message, true);
  }
});
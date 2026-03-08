document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth(['admin']);
  if (!user) return;

  await window.CommonUI.setupLayout(user);

  const info = document.getElementById('config-info');
  const formLoja = document.getElementById('form-config-agenda');
  const formDiaLoja = document.getElementById('form-config-dia-loja');
  const abertura = document.getElementById('cfg-hora-abertura');
  const fechamento = document.getElementById('cfg-hora-fechamento');
  const intervalo = document.getElementById('cfg-intervalo');
  const diaAbertura = document.getElementById('cfg-dia-abertura');
  const diaFechamento = document.getElementById('cfg-dia-fechamento');
  const diaIntervalo = document.getElementById('cfg-dia-intervalo');
  const calTitle = document.getElementById('cfg-cal-title');
  const calGrid = document.getElementById('cfg-calendar-grid');
  const dataLabel = document.getElementById('cfg-data-label');
  const slotsLoja = document.getElementById('cfg-store-slots');
  const tabButtons = document.querySelectorAll('[data-config-tab]');
  const panelLoja = document.getElementById('config-panel-loja');
  const panelBarbeiro = document.getElementById('config-panel-barbeiro');
  const selectBarbeiro = document.getElementById('cfg-barbeiro');
  const semanaRefInput = document.getElementById('cfg-semana-ref');
  const horariosBody = document.getElementById('cfg-barbeiro-horarios-body');
  const btnSalvarBarbeiro = document.getElementById('btn-salvar-horarios-barbeiro');
  const diasFechadosWrap = document.getElementById('cfg-dias-fechados');
  const btnSalvarDiasFechados = document.getElementById('btn-salvar-dias-fechados');
  const today = new Date();
  let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let slotTarget = 'abertura';
  let defaultsLoja = { hora_abertura: '09:00', hora_fechamento: '19:00', intervalo_minutos: 30 };
  let possuiConfigDia = true;

  const diasSemana = [
    { id: 0, nome: 'Domingo' },
    { id: 1, nome: 'Segunda' },
    { id: 2, nome: 'Terca' },
    { id: 3, nome: 'Quarta' },
    { id: 4, nome: 'Quinta' },
    { id: 5, nome: 'Sexta' },
    { id: 6, nome: 'Sabado' }
  ];

  function setTab(tab) {
    tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.configTab === tab));
    panelLoja.classList.toggle('active', tab === 'loja');
    panelBarbeiro.classList.toggle('active', tab === 'barbeiro');
  }

  tabButtons.forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.configTab)));

  function renderDiasFechados(selected = new Set()) {
    diasFechadosWrap.innerHTML = diasSemana.map((d) => `
      <label class="check">
        <input type="checkbox" data-dia-fechado="${d.id}" ${selected.has(d.id) ? 'checked' : ''} />
        ${d.nome}
      </label>
    `).join('');
  }

  function isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function formatMonth(date) {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function normalizeDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addMinutesToTime(hhmm, minutes) {
    const [h, m] = String(hhmm).split(':').map(Number);
    const d = new Date(2000, 0, 1, h || 0, m || 0, 0, 0);
    d.setMinutes(d.getMinutes() + minutes);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function generateStoreSlots() {
    const start = String(diaAbertura.value || defaultsLoja.hora_abertura || '09:00').slice(0, 5);
    const end = String(diaFechamento.value || defaultsLoja.hora_fechamento || '19:00').slice(0, 5);
    const step = Number(diaIntervalo.value || defaultsLoja.intervalo_minutos || 30);

    if (!start || !end || !Number.isFinite(step) || step < 5) {
      slotsLoja.innerHTML = '<p class="muted">Preencha abertura, fechamento e intervalo validos.</p>';
      return;
    }

    const slots = [];
    let current = start;
    while (current < end && slots.length < 200) {
      slots.push(current);
      current = addMinutesToTime(current, step);
    }

    const aberturaAtual = String(diaAbertura.value || '').slice(0, 5);
    const fechamentoAtual = String(diaFechamento.value || '').slice(0, 5);

    slotsLoja.innerHTML = slots.length
      ? slots.map((hora) => {
        const classes = ['slot-btn'];
        if (hora === aberturaAtual) classes.push('active');
        if (hora === fechamentoAtual) classes.push('slot-end');
        return `<button type="button" class="${classes.join(' ')}" data-hora="${hora}">${hora}</button>`;
      }).join('')
      : '<p class="muted">Nao ha horarios para a configuracao atual.</p>';
  }

  function renderLojaCalendar() {
    calTitle.textContent = formatMonth(viewMonth);
    calGrid.innerHTML = '';

    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const lastDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
    const startWeekDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const todayOnly = normalizeDate(today);

    for (let i = 0; i < startWeekDay; i += 1) {
      calGrid.insertAdjacentHTML('beforeend', '<span class="calendar-day muted"> </span>');
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const current = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      const disabled = normalizeDate(current) < todayOnly;
      const isSelected = selectedDate && isoDate(current) === isoDate(selectedDate);
      calGrid.insertAdjacentHTML(
        'beforeend',
        `<button type="button" class="calendar-day-btn ${isSelected ? 'active' : ''}" data-date="${isoDate(current)}" ${disabled ? 'disabled' : ''}>${day}</button>`
      );
    }
  }

  function updateLojaVisual() {
    dataLabel.textContent = selectedDate ? window.AppUtils.formatDate(isoDate(selectedDate)) : '-';
    generateStoreSlots();
  }

  function applyDiaForm(item) {
    const usarItem = !item || item.ativo !== false;
    diaAbertura.value = String((usarItem ? item?.hora_inicio : null) || defaultsLoja.hora_abertura || '09:00').slice(0, 5);
    diaFechamento.value = String((usarItem ? item?.hora_fim : null) || defaultsLoja.hora_fechamento || '19:00').slice(0, 5);
    diaIntervalo.value = Number((usarItem ? item?.intervalo_minutos : null) || defaultsLoja.intervalo_minutos || 30);
    slotTarget = 'abertura';
    updateLojaVisual();
  }

  async function loadConfigDiaLoja() {
    if (!selectedDate) return;
    if (!possuiConfigDia) {
      applyDiaForm(null);
      return;
    }
    const dataDia = isoDate(selectedDate);
    const { data, error } = await window.sb
      .from('loja_horarios_data')
      .select('data, ativo, hora_inicio, hora_fim, intervalo_minutos')
      .eq('data', dataDia)
      .maybeSingle();
    if (error) {
      if (error.code === '42P01') {
        possuiConfigDia = false;
        applyDiaForm(null);
        window.AppUtils.notify(info, 'Rode o SQL fix_loja_horarios_data.sql para habilitar configuracao dia a dia.', true);
        return;
      }
      throw error;
    }
    applyDiaForm(data || null);
  }

  async function loadDiasFechadosPadrao() {
    const { data, error } = await window.sb
      .from('loja_dias_fechados')
      .select('dia_semana, fechado');
    if (error) {
      if (error.code === '42P01') {
        renderDiasFechados(new Set([0]));
        window.AppUtils.notify(info, 'Rode o SQL fix_loja_dias_fechados.sql para habilitar dias fechados padrao.', true);
        return;
      }
      throw error;
    }

    const fechados = new Set((data || []).filter((r) => r.fechado).map((r) => Number(r.dia_semana)));
    renderDiasFechados(fechados);
  }

  function parseIsoDate(value) {
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  }

  function startOfWeekSunday(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  function weekDatesMap(refValue) {
    const ref = parseIsoDate(refValue || isoDate(new Date()));
    const start = startOfWeekSunday(ref);
    const map = new Map();
    diasSemana.forEach((dia) => {
      const current = new Date(start);
      current.setDate(start.getDate() + dia.id);
      map.set(dia.id, current);
    });
    return map;
  }

  async function loadConfigAgenda() {
    const { data, error } = await window.sb
      .from('configuracao_agenda')
      .select('hora_abertura, hora_fechamento, intervalo_minutos')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;

    const cfg = data || { hora_abertura: '09:00', hora_fechamento: '19:00', intervalo_minutos: 30 };
    abertura.value = String(cfg.hora_abertura).slice(0, 5);
    fechamento.value = String(cfg.hora_fechamento).slice(0, 5);
    intervalo.value = cfg.intervalo_minutos;
    defaultsLoja = cfg;
    return cfg;
  }

  function renderHorarioRows(horariosMap, defaults, datesMap) {
    horariosBody.innerHTML = diasSemana.map((d) => {
      const item = horariosMap.get(d.id) || {};
      const ativo = item.ativo ?? true;
      const inicio = String(item.hora_inicio || defaults.hora_abertura || '09:00').slice(0, 5);
      const fim = String(item.hora_fim || defaults.hora_fechamento || '19:00').slice(0, 5);
      const intv = Number(item.intervalo_minutos || defaults.intervalo_minutos || 30);
      const dateRef = datesMap.get(d.id);
      const dateText = dateRef ? window.AppUtils.formatDate(isoDate(dateRef)) : '-';

      return `
        <tr>
          <td>${d.nome}</td>
          <td>${dateText}</td>
          <td><input type="checkbox" data-dia="${d.id}" data-field="ativo" ${ativo ? 'checked' : ''} /></td>
          <td><input type="time" data-dia="${d.id}" data-field="inicio" value="${inicio}" /></td>
          <td><input type="time" data-dia="${d.id}" data-field="fim" value="${fim}" /></td>
          <td><input type="number" min="5" max="120" step="5" data-dia="${d.id}" data-field="intervalo" value="${intv}" /></td>
        </tr>
      `;
    }).join('');
  }

  async function loadBarbeiros() {
    const { data, error } = await window.sb.rpc('listar_barbeiros_publico');
    if (error) throw error;

    const rows = data || [];
    if (rows.length === 0) {
      selectBarbeiro.innerHTML = '<option value="">Sem barbeiros cadastrados</option>';
      return;
    }

    selectBarbeiro.innerHTML = rows.map((b) => `<option value="${b.id}">${b.nome}</option>`).join('');
  }

  async function loadHorariosBarbeiro(defaults) {
    const barbeiroId = selectBarbeiro.value;
    if (!barbeiroId) {
      horariosBody.innerHTML = '<tr><td colspan="6">Selecione um barbeiro.</td></tr>';
      return;
    }

    const { data, error } = await window.sb
      .from('barbeiro_horarios')
      .select('dia_semana, ativo, hora_inicio, hora_fim, intervalo_minutos')
      .eq('barbeiro_id', barbeiroId);
    if (error) throw error;

    const map = new Map((data || []).map((h) => [Number(h.dia_semana), h]));
    const datesMap = weekDatesMap(semanaRefInput.value);
    renderHorarioRows(map, defaults, datesMap);
  }

  formLoja.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const payload = {
      id: 1,
      hora_abertura: abertura.value,
      hora_fechamento: fechamento.value,
      intervalo_minutos: Number(intervalo.value)
    };

    try {
      const { error } = await window.sb.from('configuracao_agenda').upsert(payload);
      if (error) throw error;
      defaultsLoja = {
        hora_abertura: payload.hora_abertura,
        hora_fechamento: payload.hora_fechamento,
        intervalo_minutos: payload.intervalo_minutos
      };
      await loadConfigDiaLoja();
      window.AppUtils.notify(info, 'Configuracao da loja salva com sucesso.');
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  formDiaLoja.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!selectedDate) {
      window.AppUtils.notify(info, 'Selecione uma data no calendario.', true);
      return;
    }
    if (!possuiConfigDia) {
      window.AppUtils.notify(info, 'Rode o SQL fix_loja_horarios_data.sql para habilitar configuracao dia a dia.', true);
      return;
    }

    const payload = {
      data: isoDate(selectedDate),
      ativo: true,
      hora_inicio: diaAbertura.value,
      hora_fim: diaFechamento.value,
      intervalo_minutos: Number(diaIntervalo.value || defaultsLoja.intervalo_minutos || 30)
    };

    if (!payload.hora_inicio || !payload.hora_fim) {
      window.AppUtils.notify(info, 'Preencha abertura e fechamento do dia.', true);
      return;
    }

    try {
      const { error } = await window.sb.from('loja_horarios_data').upsert(payload, { onConflict: 'data' });
      if (error) throw error;
      window.AppUtils.notify(info, 'Horario do dia salvo com sucesso.');
      await loadConfigDiaLoja();
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  document.getElementById('cfg-btn-cal-prev').addEventListener('click', () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    renderLojaCalendar();
  });

  document.getElementById('cfg-btn-cal-next').addEventListener('click', () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    renderLojaCalendar();
  });

  calGrid.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.calendar-day-btn[data-date]');
    if (!btn) return;
    selectedDate = new Date(`${btn.dataset.date}T00:00:00`);
    renderLojaCalendar();
    loadConfigDiaLoja().catch((err) => window.AppUtils.notify(info, err.message, true));
  });

  slotsLoja.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.slot-btn[data-hora]');
    if (!btn) return;

    if (slotTarget === 'abertura') {
      diaAbertura.value = btn.dataset.hora;
      slotTarget = 'fechamento';
    } else {
      diaFechamento.value = btn.dataset.hora;
      slotTarget = 'abertura';
    }
    updateLojaVisual();
  });

  [diaAbertura, diaFechamento, diaIntervalo].forEach((el) => {
    el.addEventListener('change', updateLojaVisual);
    el.addEventListener('input', updateLojaVisual);
  });

  selectBarbeiro.addEventListener('change', async () => {
    try {
      const defaults = await loadConfigAgenda();
      await loadHorariosBarbeiro(defaults);
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  semanaRefInput.addEventListener('change', async () => {
    try {
      const defaults = await loadConfigAgenda();
      await loadHorariosBarbeiro(defaults);
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  btnSalvarBarbeiro.addEventListener('click', async () => {
    const barbeiroId = selectBarbeiro.value;
    if (!barbeiroId) {
      window.AppUtils.notify(info, 'Selecione um barbeiro.', true);
      return;
    }

    try {
      const rows = diasSemana.map((d) => {
        const ativo = horariosBody.querySelector(`input[data-dia="${d.id}"][data-field="ativo"]`)?.checked ?? true;
        const inicio = horariosBody.querySelector(`input[data-dia="${d.id}"][data-field="inicio"]`)?.value || null;
        const fim = horariosBody.querySelector(`input[data-dia="${d.id}"][data-field="fim"]`)?.value || null;
        const intv = Number(horariosBody.querySelector(`input[data-dia="${d.id}"][data-field="intervalo"]`)?.value || 30);

        if (!ativo) {
          return { barbeiro_id: barbeiroId, dia_semana: d.id, ativo: false, hora_inicio: null, hora_fim: null, intervalo_minutos: intv };
        }

        if (!inicio || !fim) throw new Error(`Preencha inicio e fim para ${d.nome}.`);

        return { barbeiro_id: barbeiroId, dia_semana: d.id, ativo: true, hora_inicio: inicio, hora_fim: fim, intervalo_minutos: intv };
      });

      const { error } = await window.sb.from('barbeiro_horarios').upsert(rows, { onConflict: 'barbeiro_id,dia_semana' });
      if (error) throw error;
      window.AppUtils.notify(info, 'Horarios do barbeiro salvos com sucesso.');
    } catch (err) {
      window.AppUtils.notify(info, err.message, true);
    }
  });

  btnSalvarDiasFechados.addEventListener('click', async () => {
    try {
      const checks = Array.from(diasFechadosWrap.querySelectorAll('input[data-dia-fechado]'));
      const rows = checks.map((el) => ({
        dia_semana: Number(el.dataset.diaFechado),
        fechado: Boolean(el.checked)
      }));

      const { error } = await window.sb.from('loja_dias_fechados').upsert(rows, { onConflict: 'dia_semana' });
      if (error) throw error;
      window.AppUtils.notify(info, 'Dias fechados padrao salvos com sucesso.');
    } catch (err) {
      if (err.code === '42P01') {
        window.AppUtils.notify(info, 'Rode o SQL fix_loja_dias_fechados.sql para habilitar dias fechados padrao.', true);
        return;
      }
      window.AppUtils.notify(info, err.message, true);
    }
  });

  try {
    semanaRefInput.value = isoDate(new Date());
    renderLojaCalendar();
    const defaults = await loadConfigAgenda();
    await loadDiasFechadosPadrao();
    await loadConfigDiaLoja();
    await loadBarbeiros();
    await loadHorariosBarbeiro(defaults);
  } catch (err) {
    window.AppUtils.notify(info, err.message, true);
  }
});

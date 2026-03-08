window.AppUtils = {
  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },

  formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  },

  formatDate(value) {
    if (!value) return '-';
    return new Date(value + 'T00:00:00').toLocaleDateString('pt-BR');
  },

  toDateTime(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}`);
  },

  notify(el, msg, isError = false) {
    if (!el) return;
    el.className = isError ? 'error' : 'info';
    el.textContent = msg;
  }
};


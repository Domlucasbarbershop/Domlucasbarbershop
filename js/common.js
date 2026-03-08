window.CommonUI = {
  async setupLayout(userInfo) {
    const userNameEls = document.querySelectorAll('[data-user-name]');
    userNameEls.forEach((el) => (el.textContent = userInfo?.nome || 'Usuario'));

    const logoutBtns = document.querySelectorAll('[data-logout]');
    logoutBtns.forEach((btn) => btn.addEventListener('click', () => window.Auth.logout()));

    const adminOnly = document.querySelectorAll('[data-admin-only]');
    adminOnly.forEach((el) => {
      if (userInfo?.perfil === 'admin') {
        el.style.setProperty('display', '', 'important');
      } else {
        el.style.setProperty('display', 'none', 'important');
      }
    });

    const barberOnly = document.querySelectorAll('[data-barber-only]');
    barberOnly.forEach((el) => {
      if (userInfo?.perfil === 'barbeiro') {
        el.style.setProperty('display', '', 'important');
      } else {
        el.style.setProperty('display', 'none', 'important');
      }
    });

    // Fallback: para perfil barbeiro, exibe qualquer link de navegacao que nao seja exclusivo de admin.
    if (userInfo?.perfil === 'barbeiro') {
      const barberNavFallback = document.querySelectorAll('.nav a:not([data-admin-only])');
      barberNavFallback.forEach((el) => el.style.setProperty('display', '', 'important'));
    }

    const path = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav a[href]');
    navLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href.endsWith(path)) link.classList.add('active');
      link.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
    });

    const menuToggle = document.getElementById('btn-menu-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const closeSidebar = () => document.body.classList.remove('sidebar-open');
    const toggleSidebar = () => document.body.classList.toggle('sidebar-open');

    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
  }
};


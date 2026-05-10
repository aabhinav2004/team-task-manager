(function () {
  const { app, request } = window.TTM;

  function parseHash() {
    const raw = location.hash || '#/dashboard';
    const [path, queryString = ''] = raw.slice(1).split('?');
    return { path, params: new URLSearchParams(queryString) };
  }

  async function ensureUser() {
    if (app.user) return true;
    try {
      const data = await request('/auth/me');
      app.user = data.user;
      return true;
    } catch (error) {
      return false;
    }
  }

  async function route() {
    const { path, params } = parseHash();
    const publicRoute = path === '/login';
    if (!publicRoute && !(await ensureUser())) {
      location.hash = '#/login';
      return;
    }
    if (publicRoute) {
      if (await ensureUser()) {
        location.hash = '#/dashboard';
        return;
      }
      window.AuthView.renderAuth(params.get('mode') === 'signup' ? 'signup' : 'login');
      return;
    }
    if (path === '/' || path === '/dashboard') return window.DashboardView.renderDashboard();
    if (path === '/projects') return window.ProjectsView.renderProjects();
    const projectMatch = path.match(/^\/projects\/([a-f0-9]{24})$/i);
    if (projectMatch) return window.ProjectDetail.renderProject(projectMatch[1], params.get('tab') || 'board');
    location.hash = '#/dashboard';
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  route();
})();

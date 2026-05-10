(function () {
  const { request, toast, escapeHtml } = window.TTM;

  function scorePassword(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return score;
  }

  function renderAuth(mode = 'login') {
    const isSignup = mode === 'signup';
    document.getElementById('app').innerHTML = `<section class="auth-screen">
      <div class="auth-brand">
        <div class="brand-mark">T</div>
        <div class="auth-brand-copy">
          <p class="mono text-muted">TEAM TASK MANAGER</p>
          <h1>Command work with clarity.</h1>
          <p>A sharp, fast workspace for projects, tasks, roles, overdue risk, and the daily pulse of a high-functioning team.</p>
        </div>
        <div class="auth-proof">
          <div class="proof-tile"><strong>4</strong><span>Kanban states</span></div>
          <div class="proof-tile"><strong>JWT</strong><span>httpOnly sessions</span></div>
          <div class="proof-tile"><strong>RBAC</strong><span>Admin controls</span></div>
        </div>
      </div>
      <div class="auth-panel">
        <form class="auth-card form-grid" id="auth-form" novalidate>
          <div>
            <h2>${isSignup ? 'Create your workspace' : 'Welcome back'}</h2>
            <p>${isSignup ? 'Start with an account, then create your first project.' : 'Log in to restore your session and pick up the board.'}</p>
          </div>
          ${isSignup ? `<div class="field"><label for="name">Name</label><input class="input" id="name" name="name" autocomplete="name"><small class="error-text" data-error="name"></small></div>
          <div class="field">
            <label for="accountType">Account type</label>
            <select class="select account-type-select" id="accountType" name="accountType">
              <option value="ADMIN">Admin - create and manage projects</option>
              <option value="MEMBER">Member - join projects by invitation</option>
            </select>
            <small class="error-text" data-error="accountType"></small>
          </div>` : ''}
          <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email"><small class="error-text" data-error="email"></small></div>
          <div class="field">
            <label for="password">Password</label>
            <input class="input" id="password" name="password" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}">
            ${isSignup ? '<div class="strength-meter"><span></span></div>' : ''}
            <small class="error-text" data-error="password"></small>
          </div>
          <button class="btn btn-primary" type="submit">${isSignup ? 'Sign up' : 'Log in'}</button>
          <button class="btn btn-ghost" type="button" data-toggle-auth>${isSignup ? 'Use an existing account' : 'Create an account'}</button>
          <p class="mono text-muted">Demo: admin@demo.com / Password1</p>
        </form>
      </div>
    </section>`;
    bindAuth(isSignup);
  }

  function bindAuth(isSignup) {
    const form = document.getElementById('auth-form');
    const password = form.password;
    password?.addEventListener('input', () => {
      const meter = form.querySelector('.strength-meter');
      if (!meter) return;
      const score = scorePassword(password.value);
      meter.className = `strength-meter ${score >= 4 ? 'strong' : score >= 3 ? 'medium' : ''}`;
      meter.style.setProperty('--strength', `${Math.min(100, score * 25)}%`);
    });
    form.querySelector('[data-toggle-auth]').addEventListener('click', () => {
      location.hash = isSignup ? '#/login' : '#/login?mode=signup';
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      form.querySelectorAll('[data-error]').forEach((node) => { node.textContent = ''; });
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const body = { email: form.email.value, password: form.password.value };
        if (isSignup) {
          body.name = form.name.value;
          body.accountType = form.accountType.value;
        }
        const data = await request(`/auth/${isSignup ? 'signup' : 'login'}`, { method: 'POST', body });
        window.TTM.app.user = data.user;
        toast(isSignup ? 'Account created' : 'Logged in');
        location.hash = '#/dashboard';
      } catch (error) {
        Object.entries(error.fields || {}).forEach(([key, value]) => {
          const node = form.querySelector(`[data-error="${CSS.escape(key)}"]`);
          if (node) node.textContent = value;
        });
        if (!Object.keys(error.fields || {}).length) toast(escapeHtml(error.message), 'error');
      } finally {
        button.disabled = false;
      }
    });
  }

  window.AuthView = { renderAuth };
})();

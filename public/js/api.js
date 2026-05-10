(function () {
  const statusLabels = {
    TODO: 'Todo',
    IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Review',
    DONE: 'Done',
    ACTIVE: 'Active',
    ARCHIVED: 'Archived',
    COMPLETED: 'Completed'
  };
  const priorityLabels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
  const avatarPalette = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#22c55e', '#f97316'];
  const app = {
    user: null,
    projects: [],
    currentProject: null,
    tasks: [],
    members: [],
    tab: 'board',
    filters: {},
    sort: { key: 'dueDate', dir: 'asc' }
  };

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  async function request(path, options = {}) {
    const res = await fetch(`/api${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
      body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || 'Request failed');
      error.status = res.status;
      error.fields = data.fields || {};
      throw error;
    }
    return data;
  }

  function toast(message, type = 'success') {
    const region = document.getElementById('toast-region');
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.textContent = message;
    region.appendChild(node);
    setTimeout(() => node.remove(), 4000);
  }

  function initials(name = '?') {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
  }

  function avatarColor(name = '') {
    const sum = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
    return avatarPalette[sum % avatarPalette.length];
  }

  function avatar(user, size = 32) {
    const name = user?.name || 'Unassigned';
    return `<span class="avatar" title="${escapeHtml(name)}" style="width:${size}px;height:${size}px;flex-basis:${size}px;background:${avatarColor(name)}">${escapeHtml(initials(name))}</span>`;
  }

  function avatarStack(members = []) {
    const visible = members.slice(0, 4).map((member) => avatar(member.user || member, 30)).join('');
    const more = members.length > 4 ? `<span class="avatar" style="background:#3f3f46">+${members.length - 4}</span>` : '';
    return `<span class="avatar-stack">${visible}${more}</span>`;
  }

  function badge(value, kind = 'status') {
    const css = kind === 'priority'
      ? `badge-${String(value).toLowerCase()}`
      : `badge-${String(value).toLowerCase().replaceAll('_', '-')}`;
    const label = kind === 'priority' ? priorityLabels[value] : statusLabels[value] || value;
    return `<span class="${css}">${escapeHtml(label)}</span>`;
  }

  function roleBadge(role) {
    return `<span class="role-badge">${role}</span>`;
  }

  function accountType() {
    return app.user?.accountType === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  }

  function accountRoleLabel() {
    return accountType() === 'ADMIN' ? 'You are Admin' : 'You are Member';
  }

  function formatDate(date) {
    if (!date) return 'No date';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
  }

  function relativeDate(date, status) {
    if (!date) return 'No date';
    const due = new Date(date);
    const now = new Date();
    const days = Math.round((due - now) / 86400000);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    if (days < 0 && status !== 'DONE') return `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
    return rtf.format(days, 'day');
  }

  function emptyState(title, body) {
    return `<div class="empty-state">
      <svg viewBox="0 0 260 160" fill="none" aria-hidden="true">
        <rect x="32" y="26" width="196" height="108" rx="16" fill="#1f1f25" stroke="rgba(255,255,255,.12)"/>
        <path d="M62 58h92M62 82h132M62 106h72" stroke="#6366f1" stroke-width="8" stroke-linecap="round"/>
        <circle cx="198" cy="58" r="15" fill="#f59e0b"/>
        <path d="M181 109l16-19 16 19" stroke="#22c55e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(body)}</span>
    </div>`;
  }

  function skeleton(count = 3) {
    return Array.from({ length: count }, () => '<div class="skeleton"></div>').join('');
  }

  function setTitle(title, subtitle, actions = '') {
    return `<div class="topbar">
      <button class="btn btn-ghost icon-btn mobile-menu" data-mobile-menu aria-label="Open menu">☰</button>
      <div><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div>
      <div class="page-actions">${actions}</div>
    </div>`;
  }

  function shell(content) {
    const route = location.hash || '#/dashboard';
    return `<div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="side-head"><div class="brand-mark">T</div><div><strong>Task Manager</strong><span>Team operations</span></div></div>
        <nav class="nav-list">
          <a class="nav-link ${route.startsWith('#/dashboard') ? 'active' : ''}" href="#/dashboard"><span class="nav-icon">▦</span>Dashboard</a>
          <a class="nav-link ${route.startsWith('#/projects') ? 'active' : ''}" href="#/projects"><span class="nav-icon">◇</span>Projects</a>
        </nav>
        <div class="side-foot">
          <div class="user-pill">${avatar(app.user)}<div><strong>${escapeHtml(app.user?.name || '')}</strong><span>${escapeHtml(app.user?.email || '')}</span><span class="account-role ${accountType().toLowerCase()}">${accountRoleLabel()}</span></div></div>
          <button class="btn btn-ghost" data-logout>Log out</button>
        </div>
      </aside>
      <main class="main">${content}</main>
    </div>`;
  }

  function bindGlobal() {
    document.querySelector('[data-logout]')?.addEventListener('click', async () => {
      await request('/auth/logout', { method: 'POST' });
      app.user = null;
      location.hash = '#/login';
      toast('Logged out');
    });
    document.querySelector('[data-mobile-menu]')?.addEventListener('click', () => document.getElementById('sidebar')?.classList.add('open'));
    document.addEventListener('click', (event) => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar?.classList.contains('open') && !sidebar.contains(event.target) && !event.target.closest('[data-mobile-menu]')) {
        sidebar.classList.remove('open');
      }
    }, { once: true });
  }

  function trapFocus(container, close) {
    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const nodes = [...container.querySelectorAll(focusable)];
    nodes[0]?.focus();
    function onKey(event) {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab' || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }

  window.TTM = { app, request, toast, escapeHtml, avatar, avatarStack, badge, roleBadge, accountType, accountRoleLabel, formatDate, relativeDate, emptyState, skeleton, setTitle, shell, bindGlobal, trapFocus, statusLabels, priorityLabels };
})();

(function () {
  const { app, request, shell, bindGlobal, setTitle, skeleton, badge, avatarStack, emptyState, toast, escapeHtml, roleBadge, formatDate } = window.TTM;
  const swatches = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#22c55e', '#f97316'];

  async function renderProjects() {
    document.getElementById('app').innerHTML = shell(setTitle('Projects', 'Create, review, and ship team initiatives.', '<button class="btn btn-primary" data-open-project>+ New Project</button>') + `<div class="project-grid">${skeleton(6)}</div>`);
    bindGlobal();
    document.querySelector('[data-open-project]')?.addEventListener('click', () => openProjectDrawer());
    try {
      const data = await request('/projects');
      app.projects = data.projects;
      document.getElementById('app').innerHTML = shell(projectList());
      bindGlobal();
      document.querySelector('[data-open-project]')?.addEventListener('click', () => openProjectDrawer());
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function projectList() {
    return `${setTitle('Projects', 'Create, review, and ship team initiatives.', '<button class="btn btn-primary" data-open-project>+ New Project</button>')}
      ${app.projects.length ? `<div class="project-grid">${app.projects.map(projectCard).join('')}</div>` : emptyState('No projects yet', 'Create your first project and invite the team into it.')}`;
  }

  function projectCard(project) {
    const total = project.taskCounts?.total || 0;
    const done = project.taskCounts?.done || 0;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<a class="card project-card" style="--project-color:${project.color}" href="#/projects/${project._id}">
      <div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.description || 'No description yet.')}</p></div>
      <div class="project-meta">${badge(project.status)}${avatarStack(project.members)}</div>
      <div><div class="project-meta"><span class="text-secondary">${done}/${total} done</span><span class="mono text-muted">${pct}%</span></div><div class="progress-bar"><span style="--progress:${pct}%"></span></div></div>
    </a>`;
  }

  function colorPicker(selected = '#6366f1') {
    return `<div class="color-swatch-picker">${swatches.map((color) => `<button type="button" class="swatch ${color === selected ? 'active' : ''}" style="--swatch:${color}" data-swatch="${color}" aria-label="${color}"></button>`).join('')}</div>`;
  }

  function openProjectDrawer(project = null) {
    const isEdit = Boolean(project);
    const node = document.createElement('div');
    node.className = 'drawer open';
    node.innerHTML = `<div class="drawer-head"><h2>${isEdit ? 'Project Settings' : 'New Project'}</h2><button class="btn btn-ghost icon-btn" data-close aria-label="Close">×</button></div>
      <form class="form-grid" id="project-form">
        <div class="field"><label>Name</label><input class="input" name="name" value="${escapeHtml(project?.name || '')}"><small class="error-text" data-error="name"></small></div>
        <div class="field"><label>Description</label><textarea class="textarea" name="description">${escapeHtml(project?.description || '')}</textarea><small class="error-text" data-error="description"></small></div>
        <div class="field"><label>Color</label>${colorPicker(project?.color || '#6366f1')}<input class="input mono" name="color" value="${escapeHtml(project?.color || '#6366f1')}"><small class="error-text" data-error="color"></small></div>
        ${isEdit ? `<div class="field"><label>Status</label><select class="select" name="status"><option ${project.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option><option ${project.status === 'ARCHIVED' ? 'selected' : ''}>ARCHIVED</option><option ${project.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option></select></div>` : ''}
        <div class="field"><label>Due date</label><input class="input" type="date" name="dueDate" value="${project?.dueDate ? project.dueDate.slice(0, 10) : ''}"></div>
        <button class="btn btn-primary" type="submit">${isEdit ? 'Save Changes' : 'Create Project'}</button>
      </form>`;
    document.body.appendChild(node);
    const close = () => node.remove();
    node.querySelector('[data-close]').addEventListener('click', close);
    node.querySelectorAll('[data-swatch]').forEach((btn) => btn.addEventListener('click', () => {
      node.querySelector('[name="color"]').value = btn.dataset.swatch;
      node.querySelectorAll('.swatch').forEach((item) => item.classList.toggle('active', item === btn));
    }));
    node.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      form.querySelectorAll('[data-error]').forEach((el) => { el.textContent = ''; });
      const body = { name: form.name.value, description: form.description.value, color: form.color.value, dueDate: form.dueDate.value || undefined };
      if (isEdit) body.status = form.status.value;
      try {
        const data = await request(isEdit ? `/projects/${project._id}` : '/projects', { method: isEdit ? 'PATCH' : 'POST', body });
        toast(isEdit ? 'Project updated' : 'Project created');
        close();
        if (isEdit) {
          app.currentProject = data.project;
          await window.ProjectDetail.renderProject(project._id, app.tab);
        } else {
          location.hash = `#/projects/${data.project._id}`;
        }
      } catch (error) {
        Object.entries(error.fields || {}).forEach(([key, value]) => {
          const node = form.querySelector(`[data-error="${CSS.escape(key)}"]`);
          if (node) node.textContent = value;
        });
        if (!Object.keys(error.fields || {}).length) toast(error.message, 'error');
      }
    });
  }

  async function renderProject(id, tab = app.tab || 'board') {
    app.tab = tab;
    document.getElementById('app').innerHTML = shell(setTitle('Project', 'Loading project workspace.') + skeleton(4));
    bindGlobal();
    try {
      const [projectData, taskData, memberData] = await Promise.all([
        request(`/projects/${id}`),
        request(`/projects/${id}/tasks`),
        request(`/projects/${id}/members`)
      ]);
      app.currentProject = projectData.project;
      app.membership = projectData.membership;
      app.tasks = taskData.tasks;
      app.members = memberData.members;
      app.memberCandidates = [];
      app.selectedMemberIds = [];
      document.getElementById('app').innerHTML = shell(projectDetail());
      bindGlobal();
      bindProjectDetail();
    } catch (error) {
      toast(error.message, 'error');
      if (error.status === 404) location.hash = '#/projects';
    }
  }

  function projectDetail() {
    const project = app.currentProject;
    const isAdmin = app.membership?.role === 'ADMIN';
    const actions = `<button class="btn btn-primary" data-new-task>+ New Task</button>${isAdmin ? '<button class="btn btn-ghost" data-edit-project>Settings</button>' : ''}`;
    return `${setTitle(project.name, project.description || 'Project workspace', actions)}
      <section class="detail-head">
        <div class="detail-title">
          <div><span class="mono text-muted">${project._id}</span><p>Due ${formatDate(project.dueDate)} · ${app.members.length} members · ${roleBadge(app.membership.role)}</p></div>
          ${badge(project.status)}
        </div>
      </section>
      <div class="tab-bar">
        ${['board', 'list', 'members', 'settings'].map((tab) => `<button class="tab ${app.tab === tab ? 'active' : ''}" data-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join('')}
      </div>
      <section id="project-tab">${renderTab()}</section>`;
  }

  function renderTab() {
    if (app.tab === 'board') return window.TasksView.board();
    if (app.tab === 'list') return window.TasksView.list();
    if (app.tab === 'members') return window.MembersView.members();
    return settingsTab();
  }

  function settingsTab() {
    const isAdmin = app.membership?.role === 'ADMIN';
    if (!isAdmin) return emptyState('Admin settings', 'Only project admins can edit project settings.');
    return `<div class="content-grid">
      <div class="card card-pad"><h2>Project Details</h2><p>Update project metadata, color, due date, and status.</p><button class="btn btn-primary" data-edit-project>Edit Project</button></div>
      <div class="card card-pad"><h2>Danger Zone</h2><p>Deleting a project permanently removes its tasks.</p><div class="page-actions"><button class="btn btn-danger" data-archive-project>Archive</button><button class="btn btn-danger" data-delete-project>Delete</button></div></div>
    </div>`;
  }

  function bindProjectDetail() {
    document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
      app.tab = button.dataset.tab;
      history.pushState(null, '', `#/projects/${app.currentProject._id}?tab=${app.tab}`);
      document.getElementById('project-tab').innerHTML = renderTab();
      bindProjectDetail();
    }));
    document.querySelector('[data-new-task]')?.addEventListener('click', () => window.TasksView.openTaskModal());
    document.querySelector('[data-edit-project]')?.addEventListener('click', () => openProjectDrawer(app.currentProject));
    document.querySelector('[data-archive-project]')?.addEventListener('click', async () => {
      await request(`/projects/${app.currentProject._id}`, { method: 'PATCH', body: { status: 'ARCHIVED' } });
      toast('Project archived');
      renderProject(app.currentProject._id, 'settings');
    });
    document.querySelector('[data-delete-project]')?.addEventListener('click', async () => {
      if (!confirm('Delete this project and all tasks?')) return;
      await request(`/projects/${app.currentProject._id}`, { method: 'DELETE' });
      toast('Project deleted');
      location.hash = '#/projects';
    });
    window.TasksView.bindTasks();
    window.MembersView.bindMembers();
  }

  window.ProjectsView = { renderProjects, openProjectDrawer };
  window.ProjectDetail = { renderProject };
})();

(function () {
  const { app, request, shell, bindGlobal, setTitle, skeleton, badge, avatarStack, relativeDate, emptyState, toast, escapeHtml, accountType, accountRoleLabel } = window.TTM;

  async function renderDashboard() {
    document.getElementById('app').innerHTML = shell(setTitle('Dashboard', 'A live read on team progress, ownership, and overdue work.') + `<div class="content-grid">${skeleton(4)}</div>`);
    bindGlobal();
    try {
      const data = await request('/dashboard/stats');
      document.getElementById('app').innerHTML = shell(view(data));
      bindGlobal();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function view(data) {
    const stats = data.stats;
    const cards = [
      ['Total Projects', stats.totalProjects],
      ['Total Tasks', stats.totalTasks],
      ['Completed', `${stats.completedPercent}%`],
      ['Overdue', stats.overdueTasks]
    ].map(([label, value]) => `<div class="card stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`).join('');
    const taskRows = data.myTasks.map((task) => `<tr class="${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'overdue' : ''}">
      <td><strong>${escapeHtml(task.title)}</strong><br><span class="text-muted">${escapeHtml(task.project?.name || '')}</span></td>
      <td>${badge(task.status)}</td>
      <td>${badge(task.priority, 'priority')}</td>
      <td><span class="due ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'overdue' : ''}">${relativeDate(task.dueDate, task.status)}</span></td>
    </tr>`).join('');
    const projects = data.projects.map((project) => `<a class="card project-card" style="--project-color:${project.color}" href="#/projects/${project._id}">
      <div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.description || 'No description yet.')}</p></div>
      <div class="project-meta">${badge(project.status)}${avatarStack(project.members)}</div>
    </a>`).join('');
    const isAdmin = accountType() === 'ADMIN';
    return `${setTitle('Dashboard', 'A live read on team progress, ownership, and overdue work.')}
      <div class="content-grid">
        <section class="role-banner ${isAdmin ? 'admin' : 'member'}">
          <div>
            <span class="mono">${accountRoleLabel()}</span>
            <h2>${isAdmin ? 'Admin workspace access' : 'Member workspace access'}</h2>
            <p>${isAdmin ? 'You can create projects, invite members, assign work, and manage project settings.' : 'You can view assigned projects and update task progress after an admin adds you to a project.'}</p>
          </div>
          <span class="role-badge">${isAdmin ? 'ADMIN' : 'MEMBER'}</span>
        </section>
        <section class="stats-grid">${cards}</section>
        <section class="split-grid">
          <div class="card card-pad">
            <h2>My Tasks</h2>
            ${data.myTasks.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead><tbody>${taskRows}</tbody></table></div>` : emptyState('No assigned tasks', 'When work is assigned to you, it will land here.')}
          </div>
          <div class="card card-pad">
            <h2>My Projects</h2>
            <div class="content-grid">${projects || emptyState('No projects yet', 'Create a project to start organizing work.')}</div>
          </div>
        </section>
      </div>`;
  }

  window.DashboardView = { renderDashboard };
})();

(function () {
  const { app, request, badge, avatar, relativeDate, emptyState, toast, escapeHtml, trapFocus, priorityLabels, statusLabels } = window.TTM;
  const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  function board() {
    if (!app.tasks.length) return emptyState('No tasks yet', 'Create the first task and move it through the board.');
    return `<div class="kanban-board">${statuses.map((status) => {
      const tasks = app.tasks.filter((task) => task.status === status);
      return `<section class="kanban-col" data-status="${status}">
        <div class="kanban-head"><strong>${statusLabels[status]}</strong><span class="role-badge">${tasks.length}</span></div>
        <div class="kanban-list">${tasks.map(taskCard).join('') || '<p class="text-muted">Drop tasks here.</p>'}</div>
      </section>`;
    }).join('')}</div>`;
  }

  function taskCard(task) {
    return `<article class="task-card" draggable="true" data-task-id="${task._id}">
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="project-meta">${badge(task.priority, 'priority')}<span class="due ${isOverdue(task) ? 'overdue' : ''}">${relativeDate(task.dueDate, task.status)}</span></div>
      <div class="task-foot">${task.assignee ? avatar(task.assignee) : '<span class="text-muted">Unassigned</span>'}${badge(task.status)}</div>
    </article>`;
  }

  function isOverdue(task) {
    return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  }

  function list() {
    const filtered = filteredTasks().sort(sorter);
    return `<div class="content-grid">
      <div class="card card-pad">
        <div class="form-row">
          <select class="select" data-filter="status"><option value="">All statuses</option>${statuses.map((status) => `<option value="${status}" ${app.filters.status === status ? 'selected' : ''}>${statusLabels[status]}</option>`).join('')}</select>
          <select class="select" data-filter="priority"><option value="">All priorities</option>${priorities.map((priority) => `<option value="${priority}" ${app.filters.priority === priority ? 'selected' : ''}>${priorityLabels[priority]}</option>`).join('')}</select>
        </div>
      </div>
      ${filtered.length ? `<div class="table-wrap"><table class="table">
        <thead><tr>${['title', 'status', 'priority', 'assignee', 'dueDate'].map((key) => `<th class="sortable" data-sort="${key}">${labelFor(key)}</th>`).join('')}</tr></thead>
        <tbody>${filtered.map(row).join('')}</tbody>
      </table></div>` : emptyState('No matching tasks', 'Adjust filters or create a task for this project.')}
    </div>`;
  }

  function labelFor(key) {
    return { title: 'Task', status: 'Status', priority: 'Priority', assignee: 'Assignee', dueDate: 'Due' }[key];
  }

  function row(task) {
    return `<tr class="${isOverdue(task) ? 'overdue' : ''}" data-task-row="${task._id}">
      <td><strong>${escapeHtml(task.title)}</strong><br><span class="text-muted">${escapeHtml(task.description || '')}</span></td>
      <td>${badge(task.status)}</td>
      <td>${badge(task.priority, 'priority')}</td>
      <td>${task.assignee ? `${avatar(task.assignee, 28)} ${escapeHtml(task.assignee.name)} ${window.TTM.roleBadge(memberRole(task.assignee._id))}` : 'Unassigned'}</td>
      <td><span class="due ${isOverdue(task) ? 'overdue' : ''}">${relativeDate(task.dueDate, task.status)}</span></td>
    </tr>`;
  }

  function filteredTasks() {
    return app.tasks.filter((task) => (!app.filters.status || task.status === app.filters.status) && (!app.filters.priority || task.priority === app.filters.priority));
  }

  function sorter(a, b) {
    const key = app.sort.key;
    const av = key === 'assignee' ? (a.assignee?.name || '') : (a[key] || '');
    const bv = key === 'assignee' ? (b.assignee?.name || '') : (b[key] || '');
    const result = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return app.sort.dir === 'asc' ? result : -result;
  }

  function bindTasks() {
    document.querySelectorAll('.task-card').forEach((taskCard) => {
      taskCard.addEventListener('click', () => openTaskModal(app.tasks.find((task) => task._id === taskCard.dataset.taskId)));
      taskCard.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('taskId', taskCard.dataset.taskId);
        taskCard.classList.add('dragging');
      });
      taskCard.addEventListener('dragend', () => taskCard.classList.remove('dragging'));
    });
    document.querySelectorAll('.kanban-col').forEach((column) => {
      column.addEventListener('dragover', (event) => {
        event.preventDefault();
        column.classList.add('drag-over');
      });
      column.addEventListener('dragleave', () => column.classList.remove('drag-over'));
      column.addEventListener('drop', async (event) => {
        event.preventDefault();
        column.classList.remove('drag-over');
        const taskId = event.dataTransfer.getData('taskId');
        const task = app.tasks.find((item) => item._id === taskId);
        if (!task || task.status === column.dataset.status) return;
        const previous = task.status;
        task.status = column.dataset.status;
        document.getElementById('project-tab').innerHTML = board();
        bindTasks();
        try {
          await request(`/projects/${app.currentProject._id}/tasks/${taskId}`, { method: 'PATCH', body: { status: task.status } });
          toast('Task moved');
        } catch (error) {
          task.status = previous;
          document.getElementById('project-tab').innerHTML = board();
          bindTasks();
          toast(error.message, 'error');
        }
      });
    });
    document.querySelectorAll('[data-filter]').forEach((input) => input.addEventListener('change', () => {
      app.filters[input.dataset.filter] = input.value;
      document.getElementById('project-tab').innerHTML = list();
      bindTasks();
    }));
    document.querySelectorAll('[data-sort]').forEach((th) => th.addEventListener('click', () => {
      app.sort.dir = app.sort.key === th.dataset.sort && app.sort.dir === 'asc' ? 'desc' : 'asc';
      app.sort.key = th.dataset.sort;
      document.getElementById('project-tab').innerHTML = list();
      bindTasks();
    }));
    document.querySelectorAll('[data-task-row]').forEach((row) => row.addEventListener('click', () => openTaskModal(app.tasks.find((task) => task._id === row.dataset.taskRow))));
  }

  function memberOptions(selected) {
    return `<option value="">Unassigned</option>${app.members.map((member) => `<option value="${member.user._id}" ${selected === member.user._id ? 'selected' : ''}>${escapeHtml(member.user.name)} (${member.role})</option>`).join('')}`;
  }

  function openTaskModal(task = null) {
    const isEdit = Boolean(task);
    const node = document.createElement('div');
    node.className = 'modal-overlay';
    node.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
      <div class="modal-head"><h2 id="task-modal-title">${isEdit ? 'Task Details' : 'New Task'}</h2><button class="btn btn-ghost icon-btn" data-close aria-label="Close">×</button></div>
      <form class="form-grid">
        <div class="field"><label>Title</label><input class="input" name="title" value="${escapeHtml(task?.title || '')}"><small class="error-text" data-error="title"></small></div>
        <div class="field"><label>Description</label><textarea class="textarea" name="description">${escapeHtml(task?.description || '')}</textarea></div>
        <div class="form-row">
          <div class="field"><label>Status</label><select class="select" name="status">${statuses.map((status) => `<option value="${status}" ${task?.status === status ? 'selected' : ''}>${statusLabels[status]}</option>`).join('')}</select></div>
          <div class="field"><label>Priority</label><select class="select" name="priority">${priorities.map((priority) => `<option value="${priority}" ${task?.priority === priority || (!task && priority === 'MEDIUM') ? 'selected' : ''}>${priorityLabels[priority]}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Assignee</label><select class="select" name="assignee">${memberOptions(task?.assignee?._id)}</select></div>
          <div class="field"><label>Due date</label><input class="input" type="date" name="dueDate" value="${task?.dueDate ? task.dueDate.slice(0, 10) : ''}"><small class="error-text" data-error="dueDate"></small></div>
        </div>
        ${isEdit ? `<p class="mono text-muted">Created by ${escapeHtml(task.creator?.name || 'Unknown')} ${window.TTM.roleBadge(memberRole(task.creator?._id))}</p>` : ''}
        <div class="page-actions"><button class="btn btn-primary" type="submit">${isEdit ? 'Save Task' : 'Create Task'}</button>${isEdit && app.membership?.role === 'ADMIN' ? '<button class="btn btn-danger" type="button" data-delete-task>Delete</button>' : ''}</div>
      </form>
    </div>`;
    document.body.appendChild(node);
    const cleanup = trapFocus(node.querySelector('.modal'), close);
    function close() {
      cleanup();
      node.remove();
    }
    node.querySelector('[data-close]').addEventListener('click', close);
    node.addEventListener('click', (event) => {
      if (event.target === node) close();
    });
    node.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      form.querySelectorAll('[data-error]').forEach((item) => { item.textContent = ''; });
      const body = {
        title: form.title.value,
        description: form.description.value,
        status: form.status.value,
        priority: form.priority.value,
        assignee: form.assignee.value,
        dueDate: form.dueDate.value || undefined
      };
      try {
        const data = await request(`/projects/${app.currentProject._id}/tasks${isEdit ? `/${task._id}` : ''}`, { method: isEdit ? 'PATCH' : 'POST', body });
        if (isEdit) app.tasks = app.tasks.map((item) => item._id === data.task._id ? data.task : item);
        else app.tasks.unshift(data.task);
        toast(isEdit ? 'Task updated' : 'Task created');
        close();
        refreshTab();
      } catch (error) {
        Object.entries(error.fields || {}).forEach(([key, value]) => {
          const field = form.querySelector(`[data-error="${CSS.escape(key)}"]`);
          if (field) field.textContent = value;
        });
        if (!Object.keys(error.fields || {}).length) toast(error.message, 'error');
      }
    });
    node.querySelector('[data-delete-task]')?.addEventListener('click', async () => {
      await request(`/projects/${app.currentProject._id}/tasks/${task._id}`, { method: 'DELETE' });
      app.tasks = app.tasks.filter((item) => item._id !== task._id);
      toast('Task deleted');
      close();
      refreshTab();
    });
  }

  function memberRole(userId) {
    return app.members.find((member) => member.user._id === userId)?.role || 'MEMBER';
  }

  function refreshTab() {
    document.getElementById('project-tab').innerHTML = app.tab === 'list' ? list() : app.tab === 'board' ? board() : window.MembersView.members();
    bindTasks();
    window.MembersView.bindMembers();
  }

  window.TasksView = { board, list, bindTasks, openTaskModal };
})();

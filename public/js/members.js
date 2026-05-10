(function () {
  const { app, request, avatar, roleBadge, emptyState, toast, escapeHtml } = window.TTM;

  function members() {
    const isAdmin = app.membership?.role === 'ADMIN';
    const candidates = app.memberCandidates || [];
    const selectedIds = app.selectedMemberIds || [];
    return `<div class="content-grid">
      ${isAdmin ? `<div class="card card-pad">
        <h2>Add Member</h2>
        <form class="form-grid" id="member-form">
          <div class="form-row">
            <div class="field">
              <label for="member-search">Search users</label>
              <input class="input" id="member-search" name="search" type="search" placeholder="Search by name or email" autocomplete="off">
            </div>
            <div class="field">
              <label for="member-role">Role</label>
              <select class="select" id="member-role" name="role"><option>MEMBER</option><option>ADMIN</option></select>
            </div>
          </div>
          <div class="field">
            <label>Matching users</label>
            <div class="selected-member-row" data-selected-members>
              ${selectedChips(selectedIds)}
            </div>
            <div class="member-search-list" data-member-results>
              ${candidateResults(candidates, selectedIds)}
            </div>
            <small class="text-muted">Type a name or email, then click users to select multiple members.</small>
          </div>
          <button class="btn btn-primary" type="submit">Add Selected Members</button>
        </form>
      </div>` : ''}
      <div class="card">
        ${app.members.length ? app.members.map(memberCard).join('') : emptyState('No members yet', 'Add collaborators by email once they have an account.')}
      </div>
    </div>`;
  }

  function candidateResults(candidates, selectedIds = []) {
    if (!candidates.length) return '<div class="member-result empty">No users found</div>';
    return candidates.map((user) => {
      const selected = selectedIds.includes(user._id);
      return `<button class="member-result ${selected ? 'selected' : ''}" type="button" data-pick-member="${user._id}">
        ${avatar(user, 28)}
        <span><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></span>
        <em>${selected ? 'Selected' : escapeHtml(user.accountType || 'MEMBER')}</em>
      </button>`;
    }).join('');
  }

  function selectedChips(selectedIds = []) {
    const selected = (app.memberCandidates || []).filter((user) => selectedIds.includes(user._id));
    if (!selected.length) return '<span class="text-muted">No members selected</span>';
    return selected.map((user) => `<button class="selected-member-chip" type="button" data-remove-picked="${user._id}">
      ${escapeHtml(user.name)}
      <span aria-hidden="true">x</span>
    </button>`).join('');
  }

  async function loadCandidates(search = '') {
    if (app.membership?.role !== 'ADMIN') return;
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await request(`/projects/${app.currentProject._id}/members/candidates${query}`);
    const selectedIds = app.selectedMemberIds || [];
    const selectedUsers = (app.memberCandidates || []).filter((user) => selectedIds.includes(user._id));
    const usersById = new Map([...selectedUsers, ...data.users].map((user) => [user._id, user]));
    app.memberCandidates = [...usersById.values()];
    renderCandidatePicker();
  }

  function renderCandidatePicker() {
    const results = document.querySelector('[data-member-results]');
    const selected = document.querySelector('[data-selected-members]');
    if (results) results.innerHTML = candidateResults(app.memberCandidates || [], app.selectedMemberIds || []);
    if (selected) selected.innerHTML = selectedChips(app.selectedMemberIds || []);
    bindPickerButtons();
  }

  function bindPickerButtons() {
    document.querySelectorAll('[data-pick-member]').forEach((button) => button.addEventListener('click', () => {
      app.selectedMemberIds ||= [];
      const id = button.dataset.pickMember;
      if (app.selectedMemberIds.includes(id)) {
        app.selectedMemberIds = app.selectedMemberIds.filter((item) => item !== id);
      } else {
        app.selectedMemberIds.push(id);
      }
      renderCandidatePicker();
    }));
    document.querySelectorAll('[data-remove-picked]').forEach((button) => button.addEventListener('click', () => {
      app.selectedMemberIds = (app.selectedMemberIds || []).filter((id) => id !== button.dataset.removePicked);
      renderCandidatePicker();
    }));
  }

  function memberCard(member) {
    const isAdmin = app.membership?.role === 'ADMIN';
    const isSelf = member.user._id === app.user._id;
    return `<div class="member-card">
      <div class="member-person">${avatar(member.user)}<div><strong>${escapeHtml(member.user.name)} ${roleBadge(member.role)}</strong><span>${escapeHtml(member.user.email)}</span></div></div>
      ${isAdmin ? `<div class="page-actions">
        <select class="select" data-role-user="${member.user._id}" ${isSelf ? 'title="You can keep yourself admin, but not remove the last admin."' : ''}>
          <option ${member.role === 'MEMBER' ? 'selected' : ''}>MEMBER</option>
          <option ${member.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
        </select>
        <button class="btn btn-danger" data-remove-user="${member.user._id}">Remove</button>
      </div>` : ''}
    </div>`;
  }

  function bindMembers() {
    if (document.getElementById('member-form')) {
      app.selectedMemberIds ||= [];
      loadCandidates().catch((error) => toast(error.message, 'error'));
    }
    document.getElementById('member-search')?.addEventListener('input', async (event) => {
      try {
        await loadCandidates(event.target.value);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
    document.getElementById('member-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const selected = app.selectedMemberIds || [];
      if (!selected.length) {
        toast('Select at least one member', 'error');
        return;
      }
      try {
        const data = await request(`/projects/${app.currentProject._id}/members`, { method: 'POST', body: { userIds: selected, role: form.role.value } });
        app.members = data.members;
        app.memberCandidates = [];
        app.selectedMemberIds = [];
        toast(selected.length === 1 ? 'Member added' : 'Members added');
        document.getElementById('project-tab').innerHTML = members();
        bindMembers();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
    document.querySelectorAll('[data-role-user]').forEach((select) => select.addEventListener('change', async () => {
      try {
        const data = await request(`/projects/${app.currentProject._id}/members/${select.dataset.roleUser}`, { method: 'PATCH', body: { role: select.value } });
        app.members = data.members;
        toast('Role updated');
        document.getElementById('project-tab').innerHTML = members();
        bindMembers();
      } catch (error) {
        toast(error.message, 'error');
      }
    }));
    document.querySelectorAll('[data-remove-user]').forEach((button) => button.addEventListener('click', async () => {
      try {
        const data = await request(`/projects/${app.currentProject._id}/members/${button.dataset.removeUser}`, { method: 'DELETE' });
        app.members = data.members;
        toast('Member removed');
        document.getElementById('project-tab').innerHTML = members();
        bindMembers();
      } catch (error) {
        toast(error.message, 'error');
      }
    }));
  }

  window.MembersView = { members, bindMembers };
})();

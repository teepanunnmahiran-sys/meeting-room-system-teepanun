// User Management View (Admin Only)
class UsersView {
  constructor() {
    this.users = [];
    this.roles = [];
    this.departments = [];
  }

  async render() {
    const container = document.getElementById('view-content');
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">จัดการผู้ใช้งานและสิทธิ์ (User Management)</h1>
            <p class="text-sm text-slate-500 mt-0.5">กำหนดสิทธิ์การเข้าถึง บัญชีผู้ใช้ และแผนกต่างๆ ในองค์กร</p>
          </div>
          <button onclick="window.usersView.openUserModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
            เพิ่มผู้ใช้งานใหม่
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div class="relative flex-1 min-w-[200px]">
              <input type="text" id="users-search" placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..." class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" oninput="window.usersView.applyFilters()">
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>

            <select id="users-role-filter" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none" onchange="window.usersView.applyFilters()">
              <option value="">ทุก Role</option>
            </select>

            <select id="users-dept-filter" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none" onchange="window.usersView.applyFilters()">
              <option value="">ทุกแผนก</option>
            </select>

            <select id="users-status-filter" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none" onchange="window.usersView.applyFilters()">
              <option value="">ทุกสถานะ</option>
              <option value="active">Active (เปิดใช้งาน)</option>
              <option value="disabled">Disabled (ระงับใช้งาน)</option>
            </select>
          </div>
        </div>

        <!-- Users Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th class="px-5 py-3">ผู้ใช้งาน</th>
                  <th class="px-5 py-3">อีเมล</th>
                  <th class="px-5 py-3 text-center">สิทธิ์ (Role)</th>
                  <th class="px-5 py-3">แผนก</th>
                  <th class="px-5 py-3 text-center">สถานะ</th>
                  <th class="px-5 py-3">เข้าสู่ระบบล่าสุด</th>
                  <th class="px-5 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody id="users-tbody" class="divide-y divide-slate-100">
                <tr><td colspan="7" class="py-8 text-center text-slate-400">กำลังโหลดรายชื่อผู้ใช้...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    await this.loadData();
  }

  async loadData() {
    try {
      const [users, roles, depts] = await Promise.all([
        window.api.users.getAll(),
        window.api.users.getRoles(),
        window.api.users.getDepartments()
      ]);
      this.users = users;
      this.roles = roles;
      this.departments = depts;

      const roleSel = document.getElementById('users-role-filter');
      if (roleSel) {
        roleSel.innerHTML = `<option value="">ทุก Role</option>${this.roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}`;
      }
      const deptSel = document.getElementById('users-dept-filter');
      if (deptSel) {
        deptSel.innerHTML = `<option value="">ทุกแผนก</option>${this.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}`;
      }

      this.applyFilters();
    } catch (err) {
      window.alerts.toast('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', err.message, 'error');
    }
  }

  applyFilters() {
    const search = document.getElementById('users-search')?.value.toLowerCase().trim() || '';
    const roleId = document.getElementById('users-role-filter')?.value || '';
    const deptId = document.getElementById('users-dept-filter')?.value || '';
    const status = document.getElementById('users-status-filter')?.value || '';

    let filtered = this.users.filter(u => {
      if (search && !u.name.toLowerCase().includes(search) && !u.email.toLowerCase().includes(search)) {
        return false;
      }
      if (roleId && u.role_id !== parseInt(roleId, 10)) {
        return false;
      }
      if (deptId && u.department_id !== parseInt(deptId, 10)) {
        return false;
      }
      if (status && u.status !== status) {
        return false;
      }
      return true;
    });

    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-slate-400">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(u => `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-5 py-3">
          <div class="font-bold text-slate-900">${u.name}</div>
          <div class="text-xs text-slate-400">${u.phone || 'ไม่มีเบอร์โทร'}</div>
        </td>
        <td class="px-5 py-3 font-mono text-xs text-slate-600">${u.email}</td>
        <td class="px-5 py-3 text-center">${window.formatters.getRoleBadge(u.role?.name)}</td>
        <td class="px-5 py-3 text-xs text-slate-700">${u.department ? u.department.name : '-'}</td>
        <td class="px-5 py-3 text-center">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
            ${u.status === 'active' ? 'ใช้งานปกติ' : 'ระงับใช้งาน'}
          </span>
        </td>
        <td class="px-5 py-3 text-xs text-slate-500">${u.last_login_at ? window.formatters.formatDateThai(u.last_login_at, true) : 'ยังไม่เคยเข้าสู่ระบบ'}</td>
        <td class="px-5 py-3 text-right whitespace-nowrap">
          <button onclick="window.usersView.openUserModal(${u.id})" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium mr-1 transition">
            แก้ไข
          </button>
          <button onclick="window.usersView.toggleStatusPrompt(${u.id}, '${u.status}')" class="px-2.5 py-1 border ${u.status === 'active' ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'} rounded text-xs font-medium mr-1 transition">
            ${u.status === 'active' ? 'ระงับ' : 'เปิด'}
          </button>
          <button onclick="window.usersView.resetPasswordPrompt(${u.id})" class="px-2.5 py-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded text-xs font-medium transition" title="รีเซ็ตรหัสผ่าน">
            รีเซ็ต
          </button>
        </td>
      </tr>
    `).join('');
  }

  openUserModal(userId = null) {
    const modal = document.getElementById('user-edit-modal');
    const form = document.getElementById('user-edit-form');
    const titleEl = document.getElementById('user-edit-modal-title');
    const pwdContainer = document.getElementById('user-edit-pwd-container');

    form.reset();
    document.getElementById('user-edit-id').value = userId || '';

    // Populate selects
    const roleSelect = document.getElementById('user-edit-role');
    roleSelect.innerHTML = this.roles.map(r => `<option value="${r.id}">${r.name} - ${r.description}</option>`).join('');

    const deptSelect = document.getElementById('user-edit-department');
    deptSelect.innerHTML = `<option value="">-- ไม่ระบุแผนก --</option>${this.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}`;

    if (userId) {
      titleEl.textContent = 'แก้ไขข้อมูลผู้ใช้งาน';
      pwdContainer.classList.add('hidden'); // don't require pwd on edit
      const user = this.users.find(u => u.id === userId);
      if (user) {
        document.getElementById('user-edit-name').value = user.name;
        document.getElementById('user-edit-email').value = user.email;
        document.getElementById('user-edit-phone').value = user.phone || '';
        document.getElementById('user-edit-role').value = user.role_id;
        document.getElementById('user-edit-department').value = user.department_id || '';
        document.getElementById('user-edit-status').value = user.status;
      }
    } else {
      titleEl.textContent = 'เพิ่มผู้ใช้งานใหม่';
      pwdContainer.classList.remove('hidden');
      document.getElementById('user-edit-status').value = 'active';
    }

    modal.classList.remove('hidden');
  }

  async saveUser() {
    const id = document.getElementById('user-edit-id').value;
    const name = document.getElementById('user-edit-name').value.trim();
    const email = document.getElementById('user-edit-email').value.trim();
    const phone = document.getElementById('user-edit-phone').value.trim();
    const roleId = parseInt(document.getElementById('user-edit-role').value, 10);
    const deptVal = document.getElementById('user-edit-department').value;
    const departmentId = deptVal ? parseInt(deptVal, 10) : null;
    const status = document.getElementById('user-edit-status').value;
    const password = document.getElementById('user-edit-password').value;

    if (!name || !email || !roleId) {
      window.alerts.toast('กรุณากรอกชื่อ อีเมล และเลือก Role', '', 'error');
      return;
    }

    try {
      if (id) {
        await window.api.users.update(id, {
          name,
          email,
          phone,
          role_id: roleId,
          department_id: departmentId,
          status
        });
        window.alerts.toast('อัปเดตข้อมูลผู้ใช้สำเร็จ', '', 'success');
      } else {
        if (!password || password.length < 6) {
          window.alerts.toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', '', 'error');
          return;
        }
        await window.api.users.create({
          name,
          email,
          password,
          phone,
          role_id: roleId,
          department_id: departmentId,
          status
        });
        window.alerts.toast('สร้างบัญชีผู้ใช้งานสำเร็จ', '', 'success');
      }
      document.getElementById('user-edit-modal').classList.add('hidden');
      await this.loadData();
    } catch (err) {
      window.alerts.toast('ไม่สามารถบันทึกข้อมูลผู้ใช้ได้', err.message, 'error');
    }
  }

  async toggleStatusPrompt(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const label = newStatus === 'active' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน';

    const ok = await window.alerts.confirm(
      'ยืนยันเปลี่ยนสถานะผู้ใช้',
      `คุณต้องการ ${label} บัญชีผู้ใช้นี้ใช่หรือไม่?`,
      label,
      'ยกเลิก',
      newStatus === 'disabled'
    );
    if (!ok) return;

    try {
      await window.api.users.toggleStatus(userId, newStatus);
      window.alerts.toast(`เปลี่ยนสถานะเป็น ${label} สำเร็จ`, '', 'success');
      await this.loadData();
    } catch (err) {
      window.alerts.toast('ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้', err.message, 'error');
    }
  }

  async resetPasswordPrompt(userId) {
    const newPassword = prompt('กรุณาระบุรหัสผ่านใหม่สำหรับผู้ใช้งานนี้ (อย่างน้อย 6 ตัวอักษร):');
    if (newPassword === null) return;
    if (newPassword.length < 6) {
      window.alerts.toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', '', 'error');
      return;
    }

    try {
      await window.api.users.resetPassword(userId, newPassword);
      window.alerts.toast('รีเซ็ตรหัสผ่านเรียบร้อยแล้ว', '', 'success');
    } catch (err) {
      window.alerts.toast('ไม่สามารถรีเซ็ตรหัสผ่านได้', err.message, 'error');
    }
  }
}

window.usersView = new UsersView();

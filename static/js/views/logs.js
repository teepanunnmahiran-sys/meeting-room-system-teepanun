// Audit & Activity Logs View (Admin Only)
class AuditLogsView {
  constructor() {
    this.logs = [];
  }

  async render() {
    const container = document.getElementById('view-content');
    container.innerHTML = `
      <div class="space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">บันทึกประวัติการใช้งานระบบ (Audit & Activity Logs)</h1>
          <p class="text-sm text-slate-500 mt-0.5">ตรวจสอบทุกการกระทำในระบบ การจอง การอนุมัติ และความปลอดภัย</p>
        </div>

        <!-- Filter Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div class="relative flex-1 min-w-[200px]">
              <input type="text" id="logs-search" placeholder="ค้นหารายละเอียด, IP, แอ็กชัน..." class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" oninput="window.auditLogsView.applyFilters()">
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>

            <select id="logs-action-filter" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none" onchange="window.auditLogsView.applyFilters()">
              <option value="">ทุก Action</option>
              <option value="CREATE_BOOKING">CREATE_BOOKING</option>
              <option value="APPROVE_BOOKING">APPROVE_BOOKING</option>
              <option value="REJECT_BOOKING">REJECT_BOOKING</option>
              <option value="CANCEL_BOOKING">CANCEL_BOOKING</option>
              <option value="CREATE_ROOM">CREATE_ROOM</option>
              <option value="CHANGE_ROOM_STATUS">CHANGE_ROOM_STATUS</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            </select>
          </div>

          <button onclick="window.auditLogsView.loadData()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            รีเฟรช Log
          </button>
        </div>

        <!-- Logs Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th class="px-5 py-3">วันและเวลา</th>
                  <th class="px-5 py-3">ผู้กระทำ (Actor)</th>
                  <th class="px-5 py-3">Action</th>
                  <th class="px-5 py-3">เป้าหมาย (Resource)</th>
                  <th class="px-5 py-3">รายละเอียด (Details)</th>
                  <th class="px-5 py-3 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody id="logs-tbody" class="divide-y divide-slate-100 font-mono text-xs">
                <tr><td colspan="6" class="py-8 text-center text-slate-400">กำลังโหลดรายการบันทึก...</td></tr>
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
      this.logs = await window.api.auditLogs.getAll({ limit: 150 });
      this.applyFilters();
    } catch (err) {
      window.alerts.toast('ไม่สามารถโหลด Audit Logs ได้', err.message, 'error');
    }
  }

  applyFilters() {
    const search = document.getElementById('logs-search')?.value.toLowerCase().trim() || '';
    const action = document.getElementById('logs-action-filter')?.value || '';

    let filtered = this.logs.filter(l => {
      if (search && !l.details?.toLowerCase().includes(search) && !l.action.toLowerCase().includes(search) && !l.user_name.toLowerCase().includes(search) && !l.ip_address?.toLowerCase().includes(search)) {
        return false;
      }
      if (action && l.action !== action) {
        return false;
      }
      return true;
    });

    const tbody = document.getElementById('logs-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="py-12 text-center text-slate-400 font-sans">ไม่พบบันทึกที่ตรงกับเงื่อนไข</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(l => `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-5 py-3 whitespace-nowrap text-slate-500">${window.formatters.formatDateThai(l.created_at, true)}</td>
        <td class="px-5 py-3">
          <div class="font-bold text-slate-800 font-sans">${l.user_name}</div>
          <div class="text-[11px] text-slate-400">${l.user_email}</div>
        </td>
        <td class="px-5 py-3">
          <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">${l.action}</span>
        </td>
        <td class="px-5 py-3 text-slate-600">${l.resource_type} ${l.resource_id ? `#${l.resource_id}` : ''}</td>
        <td class="px-5 py-3 text-slate-700 font-sans break-words max-w-xs">${l.details || '-'}</td>
        <td class="px-5 py-3 text-right text-slate-400">${l.ip_address || '-'}</td>
      </tr>
    `).join('');
  }
}

window.auditLogsView = new AuditLogsView();

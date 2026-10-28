// All Bookings Management View (Staff & Admin)
class AllBookingsView {
  constructor() {
    this.bookings = [];
    this.rooms = [];
  }

  async render() {
    const container = document.getElementById('view-content');
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">การจองทั้งหมด (All Bookings & Approvals)</h1>
            <p class="text-sm text-slate-500 mt-0.5">ตรวจสอบ พิจารณาอนุมัติ และจัดการคำขอจองห้องประชุมทั้งหมดในองค์กร</p>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <!-- Search -->
            <div class="relative flex-1 min-w-[200px]">
              <input type="text" id="all-bookings-search" placeholder="ค้นหาหัวข้อ, รหัสจอง, ผู้จอง..." class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" oninput="window.allBookingsView.applyFilters()">
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>

            <!-- Room Filter -->
            <select id="all-bookings-room-filter" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none" onchange="window.allBookingsView.applyFilters()">
              <option value="">ทุกห้องประชุม</option>
            </select>

            <!-- Status Filter -->
            <select id="all-bookings-status-filter" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none" onchange="window.allBookingsView.applyFilters()">
              <option value="">ทุกสถานะ</option>
              <option value="pending" selected>รออนุมัติ (Pending)</option>
              <option value="approved">อนุมัติแล้ว (Approved)</option>
              <option value="completed">เสร็จสิ้น (Completed)</option>
              <option value="rejected">ปฏิเสธ (Rejected)</option>
              <option value="cancelled">ยกเลิก (Cancelled)</option>
            </select>
          </div>

          <button onclick="window.allBookingsView.loadData()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            รีเฟรช
          </button>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th class="px-5 py-3">รหัสการจอง</th>
                  <th class="px-5 py-3">ห้องประชุม</th>
                  <th class="px-5 py-3">หัวข้อการประชุม</th>
                  <th class="px-5 py-3">ผู้ขอจอง</th>
                  <th class="px-5 py-3">วันและเวลา</th>
                  <th class="px-5 py-3 text-center">สถานะ</th>
                  <th class="px-5 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody id="all-bookings-tbody" class="divide-y divide-slate-100">
                <tr><td colspan="7" class="py-12 text-center text-slate-400">กำลังโหลดข้อมูล...</td></tr>
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
      const [bookings, rooms] = await Promise.all([
        window.api.bookings.getAll({ limit: 200 }),
        window.api.rooms.getAll()
      ]);
      this.bookings = bookings;
      this.rooms = rooms;

      const roomSelect = document.getElementById('all-bookings-room-filter');
      if (roomSelect) {
        roomSelect.innerHTML = `
          <option value="">ทุกห้องประชุม</option>
          ${this.rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
        `;
      }

      this.applyFilters();
    } catch (err) {
      window.alerts.toast('ไม่สามารถโหลดข้อมูลการจองได้', err.message, 'error');
    }
  }

  applyFilters() {
    const search = document.getElementById('all-bookings-search')?.value.toLowerCase().trim() || '';
    const roomId = document.getElementById('all-bookings-room-filter')?.value || '';
    const status = document.getElementById('all-bookings-status-filter')?.value || '';

    let filtered = this.bookings.filter(b => {
      if (search && !b.title.toLowerCase().includes(search) && !b.booking_code.toLowerCase().includes(search) && !b.organizer_name.toLowerCase().includes(search)) {
        return false;
      }
      if (roomId && b.room_id !== parseInt(roomId, 10)) {
        return false;
      }
      if (status && b.status !== status) {
        return false;
      }
      return true;
    });

    const tbody = document.getElementById('all-bookings-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-16 text-center text-slate-400">
            <svg class="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            ไม่พบรายการจองห้องประชุมที่ตรงกับเงื่อนไข
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(b => `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-5 py-4 font-mono text-xs font-semibold text-slate-600">${b.booking_code}</td>
        <td class="px-5 py-4">
          <div class="font-bold text-slate-900">${b.room_name}</div>
          <div class="text-xs text-slate-400">${b.building} &bull; ${b.floor}</div>
        </td>
        <td class="px-5 py-4 font-semibold text-slate-800">
          <div>${b.title}</div>
          <div class="text-xs text-slate-400 font-normal">${b.attendees_count} คน</div>
        </td>
        <td class="px-5 py-4">
          <div class="font-medium text-slate-900 text-xs">${b.user_name}</div>
          <div class="text-xs text-slate-400">${b.organizer_name} (${b.organizer_contact || '-'})</div>
        </td>
        <td class="px-5 py-4 whitespace-nowrap text-xs">
          <div class="font-medium text-slate-900">${window.formatters.formatDateThai(b.start_time)}</div>
          <div class="text-slate-500 font-mono">${window.formatters.formatTimeRange(b.start_time, b.end_time)}</div>
        </td>
        <td class="px-5 py-4 text-center">
          ${window.formatters.getBookingStatusBadge(b.status)}
        </td>
        <td class="px-5 py-4 text-right whitespace-nowrap">
          <button onclick="window.bookingModal.viewDetails(${b.id})" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium mr-1 transition">
            รายละเอียด
          </button>
          ${b.status === 'pending' ? `
            <button onclick="window.bookingModal.approveBooking(${b.id})" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold mr-1 transition">
              อนุมัติ
            </button>
            <button onclick="window.bookingModal.promptRejectBooking(${b.id})" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold transition">
              ปฏิเสธ
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  }
}

window.allBookingsView = new AllBookingsView();

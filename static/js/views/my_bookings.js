// My Bookings View
class MyBookingsView {
  constructor() {
    this.bookings = [];
    this.currentFilter = 'all';
  }

  async render() {
    const container = document.getElementById('view-content');
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">การจองของฉัน (My Bookings)</h1>
            <p class="text-sm text-slate-500 mt-0.5">ติดตามสถานะ แก้ไข และประวัติการจองห้องประชุมของคุณ</p>
          </div>
          <button onclick="window.bookingModal.openModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            จองห้องใหม่
          </button>
        </div>

        <!-- Status Filter Tabs -->
        <div class="border-b border-slate-200">
          <nav class="flex space-x-6">
            <button onclick="window.myBookingsView.setFilter('all')" class="my-booking-tab pb-3 border-b-2 font-medium text-sm transition ${this.currentFilter === 'all' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}">ทั้งหมด</button>
            <button onclick="window.myBookingsView.setFilter('pending')" class="my-booking-tab pb-3 border-b-2 font-medium text-sm transition ${this.currentFilter === 'pending' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}">รออนุมัติ</button>
            <button onclick="window.myBookingsView.setFilter('approved')" class="my-booking-tab pb-3 border-b-2 font-medium text-sm transition ${this.currentFilter === 'approved' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}">อนุมัติแล้ว</button>
            <button onclick="window.myBookingsView.setFilter('completed')" class="my-booking-tab pb-3 border-b-2 font-medium text-sm transition ${this.currentFilter === 'completed' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}">เสร็จสิ้น</button>
            <button onclick="window.myBookingsView.setFilter('cancelled')" class="my-booking-tab pb-3 border-b-2 font-medium text-sm transition ${this.currentFilter === 'cancelled' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}">ยกเลิกแล้ว</button>
          </nav>
        </div>

        <!-- Bookings List Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th class="px-5 py-3">รหัสการจอง</th>
                  <th class="px-5 py-3">ห้องประชุม</th>
                  <th class="px-5 py-3">หัวข้อการประชุม</th>
                  <th class="px-5 py-3">วันและเวลา</th>
                  <th class="px-5 py-3 text-center">สถานะ</th>
                  <th class="px-5 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody id="my-bookings-tbody" class="divide-y divide-slate-100">
                <tr><td colspan="6" class="py-12 text-center text-slate-400">กำลังโหลดข้อมูล...</td></tr>
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
      const curUserId = window.app.currentUser?.id;
      this.bookings = await window.api.bookings.getAll({ user_id: curUserId });
      this.renderTable();
    } catch (err) {
      window.alerts.toast('ไม่สามารถโหลดข้อมูลการจองได้', err.message, 'error');
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('.my-booking-tab').forEach(btn => {
      btn.className = `my-booking-tab pb-3 border-b-2 font-medium text-sm transition border-transparent text-slate-500 hover:text-slate-700`;
    });
    event.target.className = `my-booking-tab pb-3 border-b-2 font-bold text-sm transition border-blue-600 text-blue-600`;
    this.renderTable();
  }

  renderTable() {
    const tbody = document.getElementById('my-bookings-tbody');
    if (!tbody) return;

    let filtered = this.bookings;
    if (this.currentFilter !== 'all') {
      filtered = this.bookings.filter(b => b.status === this.currentFilter);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-16 text-center text-slate-400">
            <svg class="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            ไม่มีรายการจองห้องประชุมในหมวดนี้
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
        <td class="px-5 py-4">
          <div class="font-semibold text-slate-800">${b.title}</div>
          <div class="text-xs text-slate-500">${b.attendees_count} คน ${b.description ? `&bull; ${b.description.substring(0, 30)}...` : ''}</div>
        </td>
        <td class="px-5 py-4 whitespace-nowrap">
          <div class="font-medium text-slate-900">${window.formatters.formatDateThai(b.start_time)}</div>
          <div class="text-xs text-slate-500 font-mono">${window.formatters.formatTimeRange(b.start_time, b.end_time)}</div>
        </td>
        <td class="px-5 py-4 text-center">
          ${window.formatters.getBookingStatusBadge(b.status)}
        </td>
        <td class="px-5 py-4 text-right whitespace-nowrap">
          <button onclick="window.bookingModal.viewDetails(${b.id})" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium mr-1.5 transition">
            ดูรายละเอียด
          </button>
          ${['pending', 'approved'].includes(b.status) ? `
            <button onclick="window.bookingModal.cancelBooking(${b.id})" class="px-3 py-1 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded text-xs font-medium transition">
              ยกเลิก
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  }
}

window.myBookingsView = new MyBookingsView();

// Reports and Analytics View
class ReportsView {
  constructor() {
    this.currentRange = 'month';
    this.reportData = null;
  }

  async render() {
    const container = document.getElementById('view-content');
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">รายงานและสถิติ (Reports & Analytics)</h1>
            <p class="text-sm text-slate-500 mt-0.5">วิเคราะห์อัตราการใช้งานห้องประชุม สถิติการจอง และส่งออกรายงาน</p>
          </div>
          <!-- Export Buttons -->
          <div class="flex items-center gap-2">
            <button onclick="window.reportsView.exportReport('xlsx')" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Export Excel (.xlsx)
            </button>
            <button onclick="window.reportsView.exportReport('csv')" class="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              CSV
            </button>
            <button onclick="window.reportsView.exportReport('pdf')" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              PDF
            </button>
          </div>
        </div>

        <!-- Filter Period Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">เลือกช่วงเวลา:</span>
            <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button onclick="window.reportsView.setRange('today')" class="range-btn px-3 py-1 text-xs font-medium rounded-md transition ${this.currentRange === 'today' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">วันนี้</button>
              <button onclick="window.reportsView.setRange('week')" class="range-btn px-3 py-1 text-xs font-medium rounded-md transition ${this.currentRange === 'week' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">สัปดาห์นี้</button>
              <button onclick="window.reportsView.setRange('month')" class="range-btn px-3 py-1 text-xs font-medium rounded-md transition ${this.currentRange === 'month' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">เดือนนี้</button>
              <button onclick="window.reportsView.setRange('year')" class="range-btn px-3 py-1 text-xs font-medium rounded-md transition ${this.currentRange === 'year' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">ปีนี้</button>
              <button onclick="window.reportsView.setRange('custom')" class="range-btn px-3 py-1 text-xs font-medium rounded-md transition ${this.currentRange === 'custom' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">กำหนดเอง</button>
            </div>
          </div>

          <!-- Custom Date Range Inputs -->
          <div id="custom-range-inputs" class="${this.currentRange === 'custom' ? 'flex' : 'hidden'} items-center gap-2">
            <input type="date" id="report-start-date" class="px-2.5 py-1 text-xs border rounded-lg bg-slate-50">
            <span class="text-xs text-slate-400">ถึง</span>
            <input type="date" id="report-end-date" class="px-2.5 py-1 text-xs border rounded-lg bg-slate-50">
            <button onclick="window.reportsView.loadData()" class="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold">ค้นหา</button>
          </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="report-kpi-grid">
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p class="text-xs font-semibold text-slate-400 uppercase">การจองทั้งหมด</p>
            <h3 class="text-2xl font-bold text-slate-900 mt-1" id="rep-total-bookings">-</h3>
            <p class="text-[11px] text-slate-500 mt-1" id="rep-approved-count">- อนุมัติ</p>
          </div>
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p class="text-xs font-semibold text-slate-400 uppercase">ชั่วโมงการใช้งานรวม</p>
            <h3 class="text-2xl font-bold text-blue-600 mt-1" id="rep-total-hours">-</h3>
            <p class="text-[11px] text-slate-500 mt-1">ชั่วโมงประชุมที่มีผล</p>
          </div>
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p class="text-xs font-semibold text-slate-400 uppercase">ห้องที่ถูกใช้มากที่สุด</p>
            <h3 class="text-lg font-bold text-emerald-600 mt-1 truncate" id="rep-most-used">-</h3>
            <p class="text-[11px] text-slate-500 mt-1" id="rep-most-used-cnt">- ครั้ง</p>
          </div>
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p class="text-xs font-semibold text-slate-400 uppercase">อัตราการยกเลิก</p>
            <h3 class="text-2xl font-bold text-rose-600 mt-1" id="rep-cancel-rate">-%</h3>
            <p class="text-[11px] text-slate-500 mt-1" id="rep-cancel-count">- รายการที่ยกเลิก</p>
          </div>
        </div>

        <!-- Room Statistics Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 class="font-bold text-slate-900 text-sm">สถิติการใช้งานแยกตามห้องประชุม (Room Usage Statistics)</h3>
            <span class="text-xs text-slate-400 font-normal">เรียงจากจำนวนการจองมากไปน้อย</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th class="px-5 py-3">รหัสห้อง</th>
                  <th class="px-5 py-3">ชื่อห้องประชุม</th>
                  <th class="px-5 py-3 text-center">ความจุ</th>
                  <th class="px-5 py-3 text-center">จำนวนการจอง (ครั้ง)</th>
                  <th class="px-5 py-3 text-center">ชั่วโมงการใช้รวม</th>
                  <th class="px-5 py-3 text-right">อัตราการใช้งาน</th>
                </tr>
              </thead>
              <tbody id="report-rooms-tbody" class="divide-y divide-slate-100">
                <tr><td colspan="6" class="py-8 text-center text-slate-400">กำลังประมวลผลรายงาน...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- User Statistics Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 class="font-bold text-slate-900 text-sm">สถิติการใช้งานแยกตามผู้ใช้งาน (User Breakdown)</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th class="px-5 py-3">ชื่อผู้ใช้งาน</th>
                  <th class="px-5 py-3">แผนก</th>
                  <th class="px-5 py-3 text-center">จำนวนการจอง</th>
                  <th class="px-5 py-3 text-right">ชั่วโมงการใช้งานรวม</th>
                </tr>
              </thead>
              <tbody id="report-users-tbody" class="divide-y divide-slate-100">
                <tr><td colspan="4" class="py-8 text-center text-slate-400">กำลังประมวลผลรายงาน...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    await this.loadData();
  }

  setRange(range) {
    this.currentRange = range;
    const customDiv = document.getElementById('custom-range-inputs');
    if (range === 'custom') {
      customDiv.classList.remove('hidden');
      customDiv.classList.add('flex');
    } else {
      customDiv.classList.add('hidden');
      customDiv.classList.remove('flex');
      this.loadData();
    }
  }

  async loadData() {
    try {
      const startDate = document.getElementById('report-start-date')?.value || null;
      const endDate = document.getElementById('report-end-date')?.value || null;

      const data = await window.api.reports.getSummary({
        range_type: this.currentRange,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      });
      this.reportData = data;

      document.getElementById('rep-total-bookings').textContent = data.total_bookings;
      document.getElementById('rep-approved-count').textContent = `${data.approved_bookings} อนุมัติ &bull; ${data.pending_bookings} รอ`;
      document.getElementById('rep-total-hours').textContent = `${data.total_hours} ชม.`;
      document.getElementById('rep-cancel-rate').textContent = `${data.cancellation_rate}%`;
      document.getElementById('rep-cancel-count').textContent = `${data.cancelled_bookings} รายการที่ยกเลิก`;

      if (data.most_used_room) {
        document.getElementById('rep-most-used').textContent = data.most_used_room.room_name;
        document.getElementById('rep-most-used-cnt').textContent = `${data.most_used_room.total_bookings} การจอง (${data.most_used_room.total_hours} ชม.)`;
      } else {
        document.getElementById('rep-most-used').textContent = 'ไม่มีข้อมูล';
        document.getElementById('rep-most-used-cnt').textContent = '-';
      }

      // Render Rooms Table
      const rTbody = document.getElementById('report-rooms-tbody');
      if (rTbody) {
        if (!data.room_stats || data.room_stats.length === 0) {
          rTbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-slate-400">ไม่มีข้อมูลการใช้ห้อง</td></tr>';
        } else {
          rTbody.innerHTML = data.room_stats.map(r => `
            <tr class="hover:bg-slate-50 transition">
              <td class="px-5 py-3 font-mono text-xs font-semibold text-slate-600">${r.room_code}</td>
              <td class="px-5 py-3 font-bold text-slate-900">${r.room_name}</td>
              <td class="px-5 py-3 text-center text-slate-600">${r.capacity} คน</td>
              <td class="px-5 py-3 text-center font-semibold text-blue-600">${r.total_bookings}</td>
              <td class="px-5 py-3 text-center font-mono text-slate-700">${r.total_hours} ชม.</td>
              <td class="px-5 py-3 text-right">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${r.total_bookings > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}">
                  ${r.utilization_rate}%
                </span>
              </td>
            </tr>
          `).join('');
        }
      }

      // Render Users Table
      const uTbody = document.getElementById('report-users-tbody');
      if (uTbody) {
        if (!data.user_stats || data.user_stats.length === 0) {
          uTbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-slate-400">ไม่มีข้อมูลผู้ใช้งาน</td></tr>';
        } else {
          uTbody.innerHTML = data.user_stats.map(u => `
            <tr class="hover:bg-slate-50 transition">
              <td class="px-5 py-3 font-bold text-slate-900">${u.user_name}</td>
              <td class="px-5 py-3 text-slate-600 text-xs">${u.department_name}</td>
              <td class="px-5 py-3 text-center font-semibold text-blue-600">${u.booking_count} ครั้ง</td>
              <td class="px-5 py-3 text-right font-mono text-slate-700">${u.total_hours} ชม.</td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      window.alerts.toast('ไม่สามารถสร้างรายงานได้', err.message, 'error');
    }
  }

  exportReport(format) {
    const startDate = document.getElementById('report-start-date')?.value || null;
    const endDate = document.getElementById('report-end-date')?.value || null;
    const exportUrl = window.api.reports.exportUrl(format, this.currentRange, startDate, endDate);

    // Trigger download via hidden link with authorization token
    window.location.href = exportUrl;
    window.alerts.toast('เริ่มดาวน์โหลดรายงานแล้ว', `รูปแบบไฟล์: ${format.toUpperCase()}`, 'info');
  }
}

window.reportsView = new ReportsView();

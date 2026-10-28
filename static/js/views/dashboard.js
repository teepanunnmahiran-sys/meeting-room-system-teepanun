// Dashboard View
class DashboardView {
  constructor() {
    this.dailyChart = null;
    this.usageChart = null;
    this.monthlyChart = null;
  }

  async render() {
    const container = document.getElementById('view-content');
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">ภาพรวมระบบ (Executive Dashboard)</h1>
            <p class="text-sm text-slate-500 mt-0.5">ภาพรวมการใช้งานห้องประชุม สถิติ และกำหนดการประจำวัน</p>
          </div>
          <div class="flex items-center gap-2.5">
            <button onclick="window.app.navigate('rooms')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              จองห้องประชุมใหม่
            </button>
          </div>
        </div>

        <!-- Row 1: KPI Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards-container">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">ห้องทั้งหมด</p>
              <h3 class="text-2xl font-bold text-slate-900 mt-1" id="kpi-total-rooms">-</h3>
              <p class="text-xs text-slate-400 mt-1">พร้อมรองรับทุกแผนก</p>
            </div>
            <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">ห้องที่ว่างขณะนี้</p>
              <h3 class="text-2xl font-bold text-emerald-600 mt-1" id="kpi-available-rooms">-</h3>
              <p class="text-xs text-emerald-600/80 mt-1">พร้อมใช้งานทันที</p>
            </div>
            <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">กำลังใช้งาน</p>
              <h3 class="text-2xl font-bold text-rose-600 mt-1" id="kpi-occupied-rooms">-</h3>
              <p class="text-xs text-slate-400 mt-1">มีประชุมอยู่ ณ ขณะนี้</p>
            </div>
            <div class="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">การจองวันนี้</p>
              <h3 class="text-2xl font-bold text-blue-600 mt-1" id="kpi-today-bookings">-</h3>
              <p class="text-xs text-slate-400 mt-1" id="kpi-pending-approvals">- รออนุมัติ</p>
            </div>
            <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
          </div>
        </div>

        <!-- Row 2: Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Daily Bookings Trend Chart -->
          <div class="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-900 text-sm">แนวโน้มการจองห้องประชุม (14 วันล่าสุด)</h3>
              <span class="text-xs text-slate-400 font-normal">จำนวนการจองต่อวัน</span>
            </div>
            <div class="h-64 relative">
              <canvas id="daily-trend-chart"></canvas>
            </div>
          </div>

          <!-- Room Usage Breakdown Chart -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-900 text-sm">สัดส่วนการใช้ห้องประชุม</h3>
              <span class="text-xs text-slate-400 font-normal">แยกตามห้อง</span>
            </div>
            <div class="h-64 relative">
              <canvas id="room-usage-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Row 3: Upcoming Meetings & Room Utilization Rate -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Upcoming Meetings -->
          <div class="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-900 text-sm">การประชุมที่กำลังจะมาถึง (Upcoming Meetings)</h3>
              <button onclick="window.app.navigate('calendar')" class="text-xs font-semibold text-blue-600 hover:text-blue-700">ดูปฏิทินทั้งหมด &rarr;</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-400 text-xs uppercase font-medium">
                    <th class="pb-3">ห้องประชุม</th>
                    <th class="pb-3">หัวข้อการประชุม</th>
                    <th class="pb-3">ผู้จัดประชุม</th>
                    <th class="pb-3">เวลา</th>
                    <th class="pb-3 text-right">สถานะ</th>
                  </tr>
                </thead>
                <tbody id="upcoming-meetings-tbody" class="divide-y divide-slate-100">
                  <tr><td colspan="5" class="py-6 text-center text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Room Utilization Rate -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-900 text-sm">อัตราการใช้งานห้อง (Utilization)</h3>
              <span class="text-xs text-slate-400 font-normal">% ในเวลางาน</span>
            </div>
            <div id="utilization-bars-container" class="space-y-4">
              <p class="text-xs text-slate-400 text-center py-4">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.loadData();
  }

  async loadData() {
    try {
      const [summary, charts, upcoming] = await Promise.all([
        window.api.dashboard.getSummary(),
        window.api.dashboard.getCharts(),
        window.api.dashboard.getUpcoming(6)
      ]);

      // Populate KPIs
      document.getElementById('kpi-total-rooms').textContent = summary.total_rooms;
      document.getElementById('kpi-available-rooms').textContent = summary.available_rooms;
      document.getElementById('kpi-occupied-rooms').textContent = summary.occupied_rooms;
      document.getElementById('kpi-today-bookings').textContent = summary.today_bookings;
      document.getElementById('kpi-pending-approvals').textContent = `${summary.pending_approvals} รายการรออนุมัติ`;

      // Render Charts
      this.renderDailyTrendChart(charts.daily_trends);
      this.renderRoomUsageChart(charts.room_usage);
      this.renderUtilizationBars(charts.utilization_rate);

      // Render Upcoming Table
      this.renderUpcomingTable(upcoming);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      window.alerts.toast('ไม่สามารถโหลดข้อมูล Dashboard ได้', err.message, 'error');
    }
  }

  renderDailyTrendChart(data) {
    const ctx = document.getElementById('daily-trend-chart')?.getContext('2d');
    if (!ctx) return;

    if (this.dailyChart) this.dailyChart.destroy();

    this.dailyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'จำนวนการจอง',
          data: data.data,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#2563EB',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }

  renderRoomUsageChart(data) {
    const ctx = document.getElementById('room-usage-chart')?.getContext('2d');
    if (!ctx) return;

    if (this.usageChart) this.usageChart.destroy();

    const colors = [
      '#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'
    ];

    this.usageChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.counts,
          backgroundColor: colors.slice(0, data.labels.length),
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } }
          }
        },
        cutout: '68%'
      }
    });
  }

  renderUtilizationBars(rates) {
    const container = document.getElementById('utilization-bars-container');
    if (!container) return;

    if (!rates || rates.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ไม่มีข้อมูลการใช้งาน</p>';
      return;
    }

    container.innerHTML = rates.map(item => `
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="font-medium text-slate-700 truncate max-w-[180px]">${item.room_name}</span>
          <span class="font-bold text-slate-900">${item.rate}% (${item.hours} ชม.)</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2">
          <div class="h-2 rounded-full ${item.rate > 70 ? 'bg-rose-500' : item.rate > 40 ? 'bg-blue-600' : 'bg-emerald-500'}" style="width: ${Math.min(item.rate, 100)}%"></div>
        </div>
      </div>
    `).join('');
  }

  renderUpcomingTable(meetings) {
    const tbody = document.getElementById('upcoming-meetings-tbody');
    if (!tbody) return;

    if (!meetings || meetings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-slate-400">
            <svg class="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            ไม่มีการประชุมที่กำลังจะมาถึงในเร็วๆ นี้
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = meetings.map(m => `
      <tr class="hover:bg-slate-50 transition cursor-pointer" onclick="window.bookingModal.viewDetails(${m.id})">
        <td class="py-3 pr-3 font-semibold text-slate-800">${m.room_name}</td>
        <td class="py-3 pr-3 text-slate-700 font-medium">${m.title}</td>
        <td class="py-3 pr-3 text-slate-500 text-xs">${m.organizer_name}</td>
        <td class="py-3 pr-3 text-slate-600 text-xs whitespace-nowrap">${window.formatters.formatDateThai(m.start_time, true)}</td>
        <td class="py-3 text-right">${window.formatters.getBookingStatusBadge(m.status)}</td>
      </tr>
    `).join('');
  }
}

window.dashboardView = new DashboardView();

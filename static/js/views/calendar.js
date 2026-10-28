// FullCalendar Integration View
class CalendarView {
  constructor() {
    this.calendarInstance = null;
    this.rooms = [];
  }

  async render() {
    const container = document.getElementById('view-content');
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">ปฏิทินการจองห้องประชุม (Interactive Calendar)</h1>
            <p class="text-sm text-slate-500 mt-0.5">ตรวจสอบตารางเวลาว่าง และคลิกที่ช่วงเวลาว่างเพื่อจองได้ทันที</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.bookingModal.openModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              จองห้องประชุม
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <div>
              <select id="calendar-room-filter" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" onchange="window.calendarView.refetchEvents()">
                <option value="">ทุกห้องประชุม (All Rooms)</option>
              </select>
            </div>
            <div>
              <select id="calendar-status-filter" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" onchange="window.calendarView.refetchEvents()">
                <option value="">ทุกสถานะ (All Status)</option>
                <option value="approved">อนุมัติแล้ว (Approved)</option>
                <option value="pending">รออนุมัติ (Pending)</option>
                <option value="completed">เสร็จสิ้น (Completed)</option>
              </select>
            </div>
          </div>

          <!-- Color Legends -->
          <div class="flex items-center gap-3 text-xs text-slate-600">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-blue-600"></span> อนุมัติแล้ว</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-amber-500"></span> รออนุมัติ</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-slate-500"></span> เสร็จสิ้น</span>
          </div>
        </div>

        <!-- Calendar Container -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div id="fullcalendar-root"></div>
        </div>
      </div>
    `;

    await this.initCalendar();
  }

  async initCalendar() {
    try {
      this.rooms = await window.api.rooms.getAll();
      const filterSelect = document.getElementById('calendar-room-filter');
      if (filterSelect) {
        filterSelect.innerHTML = `
          <option value="">ทุกห้องประชุม (All Rooms)</option>
          ${this.rooms.map(r => `<option value="${r.id}">${r.name} (${r.building})</option>`).join('')}
        `;
      }

      const calendarEl = document.getElementById('fullcalendar-root');
      if (!calendarEl) return;

      const isMobile = window.innerWidth < 768;

      this.calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: isMobile ? 'listWeek' : 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: isMobile ? 'listWeek,timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
        },
        buttonText: {
          today: 'วันนี้',
          month: 'เดือน',
          week: 'สัปดาห์',
          day: 'วัน',
          list: 'รายการ'
        },
        locale: 'th',
        height: 'auto',
        navLinks: true,
        selectable: true,
        selectMirror: true,
        nowIndicator: true,
        businessHours: {
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: '08:00',
          endTime: '18:00',
        },
        events: async (info, successCallback, failureCallback) => {
          try {
            const roomId = document.getElementById('calendar-room-filter')?.value || null;
            const statusFilter = document.getElementById('calendar-status-filter')?.value || null;
            const events = await window.api.calendar.getEvents({
              start: info.startStr,
              end: info.endStr,
              room_id: roomId || undefined,
              status_filter: statusFilter || undefined
            });
            successCallback(events);
          } catch (err) {
            failureCallback(err);
          }
        },
        eventClick: (info) => {
          info.jsEvent.preventDefault();
          const bookingId = parseInt(info.event.id, 10);
          if (bookingId) {
            window.bookingModal.viewDetails(bookingId);
          }
        },
        select: (info) => {
          const selectedDate = info.startStr.split('T')[0];
          let startTime = '10:00';
          let endTime = '11:00';

          if (info.startStr.includes('T')) {
            startTime = info.startStr.split('T')[1].substring(0, 5);
          }
          if (info.endStr.includes('T')) {
            endTime = info.endStr.split('T')[1].substring(0, 5);
          }

          const currentRoomFilter = document.getElementById('calendar-room-filter')?.value;
          const preselectRoomId = currentRoomFilter ? parseInt(currentRoomFilter, 10) : null;

          window.bookingModal.openModal(preselectRoomId, selectedDate, startTime, endTime);
        }
      });

      this.calendarInstance.render();
    } catch (e) {
      console.error('Error init calendar:', e);
    }
  }

  refetchEvents() {
    if (this.calendarInstance) {
      this.calendarInstance.refetchEvents();
    }
  }
}

window.calendarView = new CalendarView();

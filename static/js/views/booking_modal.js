// Booking Modal & Details Modal Controller
class BookingModalController {
  constructor() {
    this.checkTimeout = null;
    this.currentConflictData = null;
    this.editingBookingId = null;
    this.rooms = [];
    this.equipment = [];
  }

  async initData() {
    if (this.rooms.length === 0) {
      try {
        const [r, eq] = await Promise.all([
          window.api.rooms.getAll(),
          window.api.rooms.getEquipment()
        ]);
        this.rooms = r;
        this.equipment = eq;
      } catch (e) {
        console.error('Error init booking modal data:', e);
      }
    }
  }

  async openModal(preselectRoomId = null, preselectDate = null, preselectStart = null, preselectEnd = null, bookingToEdit = null) {
    await this.initData();
    const modal = document.getElementById('booking-modal');
    const form = document.getElementById('booking-form');
    const titleEl = document.getElementById('booking-modal-title');
    const warningContainer = document.getElementById('booking-conflict-warning');

    form.reset();
    warningContainer.classList.add('hidden');
    warningContainer.innerHTML = '';
    this.currentConflictData = null;
    this.editingBookingId = bookingToEdit ? bookingToEdit.id : null;

    // Populate Room Select
    const roomSelect = document.getElementById('booking-room-id');
    roomSelect.innerHTML = `
      <option value="">-- กรุณาเลือกห้องประชุม --</option>
      ${this.rooms.map(r => `
        <option value="${r.id}" ${r.id === preselectRoomId ? 'selected' : ''} ${r.status === 'maintenance' ? 'disabled' : ''}>
          ${r.name} (${r.building} - ${r.capacity} ที่นั่ง) ${r.status === 'maintenance' ? '[ปิดปรับปรุง]' : ''}
        </option>
      `).join('')}
    `;

    // Populate Equipment Checkboxes
    const eqContainer = document.getElementById('booking-equipment-container');
    eqContainer.innerHTML = this.equipment.map(eq => `
      <label class="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
        <input type="checkbox" name="booking_equipment" value="${eq.id}" class="rounded text-blue-600 focus:ring-blue-500">
        ${eq.name}
      </label>
    `).join('');

    // Pre-fill default organizer info from logged in user
    const curUser = window.app.currentUser;
    if (curUser) {
      document.getElementById('booking-organizer-name').value = curUser.name || '';
      document.getElementById('booking-organizer-contact').value = curUser.phone || curUser.email || '';
    }

    // Default Dates
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    document.getElementById('booking-date').value = preselectDate || todayStr;

    // Default Times (e.g. 10:00 - 11:00)
    document.getElementById('booking-start-time').value = preselectStart || '10:00';
    document.getElementById('booking-end-time').value = preselectEnd || '11:00';
    document.getElementById('booking-attendees').value = '4';

    if (bookingToEdit) {
      titleEl.textContent = 'แก้ไขการจองห้องประชุม';
      document.getElementById('booking-title').value = bookingToEdit.title;
      document.getElementById('booking-description').value = bookingToEdit.description || '';
      document.getElementById('booking-attendees').value = bookingToEdit.attendees_count;
      document.getElementById('booking-organizer-name').value = bookingToEdit.organizer_name;
      document.getElementById('booking-organizer-contact').value = bookingToEdit.organizer_contact || '';

      const sDate = new Date(bookingToEdit.start_time);
      const eDate = new Date(bookingToEdit.end_time);
      document.getElementById('booking-date').value = sDate.toISOString().split('T')[0];
      document.getElementById('booking-start-time').value = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
      document.getElementById('booking-end-time').value = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;

      roomSelect.value = bookingToEdit.room_id;
    } else {
      titleEl.textContent = 'จองห้องประชุม';
    }

    // Clear dynamic participants container
    document.getElementById('booking-participants-list').innerHTML = '';
    this.addParticipantRow(curUser?.name || '', curUser?.email || '', 'host');

    modal.classList.remove('hidden');

    // Trigger initial conflict validation
    this.triggerConflictCheck();
  }

  addParticipantRow(name = '', email = '', role = 'attendee') {
    const list = document.getElementById('booking-participants-list');
    const rowId = `participant-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'flex items-center gap-2';
    row.innerHTML = `
      <input type="text" placeholder="ชื่อ-นามสกุล" value="${name}" class="participant-name flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
      <input type="email" placeholder="อีเมล" value="${email}" class="participant-email flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
      <select class="participant-role px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none">
        <option value="attendee" ${role === 'attendee' ? 'selected' : ''}>ผู้เข้าร่วม</option>
        <option value="host" ${role === 'host' ? 'selected' : ''}>ประธาน/ผู้จัด</option>
      </select>
      <button type="button" onclick="document.getElementById('${rowId}').remove()" class="p-1.5 text-slate-400 hover:text-rose-600 transition" title="ลบผู้เข้าร่วม">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      </button>
    `;
    list.appendChild(row);
  }

  triggerConflictCheck() {
    clearTimeout(this.checkTimeout);
    this.checkTimeout = setTimeout(() => this.performConflictCheck(), 350);
  }

  async performConflictCheck() {
    const roomId = parseInt(document.getElementById('booking-room-id')?.value, 10);
    const dateStr = document.getElementById('booking-date')?.value;
    const startTimeStr = document.getElementById('booking-start-time')?.value;
    const endTimeStr = document.getElementById('booking-end-time')?.value;
    const attendees = parseInt(document.getElementById('booking-attendees')?.value || '1', 10);
    const warningContainer = document.getElementById('booking-conflict-warning');
    const submitBtn = document.getElementById('booking-submit-btn');

    if (!roomId || !dateStr || !startTimeStr || !endTimeStr) {
      warningContainer.classList.add('hidden');
      return;
    }

    const startDateTime = `${dateStr}T${startTimeStr}:00`;
    const endDateTime = `${dateStr}T${endTimeStr}:00`;

    try {
      const res = await window.api.bookings.checkConflict({
        room_id: roomId,
        start_time: startDateTime,
        end_time: endDateTime,
        attendees_count: attendees,
        exclude_booking_id: this.editingBookingId
      });

      this.currentConflictData = res;

      if (!res.is_available) {
        submitBtn.disabled = true;
        submitBtn.className = 'px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-300 text-slate-500 cursor-not-allowed';

        let altRoomsHtml = '';
        if (res.alternative_rooms && res.alternative_rooms.length > 0) {
          altRoomsHtml = `
            <div class="mt-3">
              <p class="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ห้องอื่นที่ว่างในเวลาเดียวกัน (แนะนำ):
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${res.alternative_rooms.map(r => `
                  <button type="button" onclick="window.bookingModal.switchRoom(${r.id})" class="p-2 text-left bg-white border border-blue-200 rounded hover:bg-blue-50 transition text-xs flex items-center justify-between">
                    <div>
                      <span class="font-bold text-slate-900 block">${r.name}</span>
                      <span class="text-[11px] text-slate-500">${r.building} &bull; ${r.capacity} ที่นั่ง</span>
                    </div>
                    <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold text-[10px]">เลือกห้องนี้</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        }

        let altSlotsHtml = '';
        if (res.alternative_slots && res.alternative_slots.length > 0) {
          altSlotsHtml = `
            <div class="mt-3">
              <p class="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ช่วงเวลาอื่นที่ห้องนี้ว่างในวันนี้:
              </p>
              <div class="flex flex-wrap gap-1.5">
                ${res.alternative_slots.map(s => {
                  const sTime = new Date(s.start_time).toTimeString().substring(0, 5);
                  const eTime = new Date(s.end_time).toTimeString().substring(0, 5);
                  return `
                    <button type="button" onclick="window.bookingModal.switchTime('${sTime}', '${eTime}')" class="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 rounded text-xs font-medium text-slate-700 transition">
                      ${s.label}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }

        warningContainer.className = 'p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 space-y-2';
        warningContainer.innerHTML = `
          <div class="flex items-start gap-2.5">
            <svg class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <div>
              <h4 class="font-bold text-sm text-rose-900">${res.message}</h4>
              <p class="text-xs text-rose-700 mt-0.5">กรุณาเลือกช่วงเวลาอื่น หรือเลือกห้องสำรองที่แนะนำด้านล่าง</p>
            </div>
          </div>
          ${altRoomsHtml}
          ${altSlotsHtml}
        `;
        warningContainer.classList.remove('hidden');
      } else {
        // Room Available!
        submitBtn.disabled = false;
        submitBtn.className = 'px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition';

        warningContainer.className = 'p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2 text-xs font-medium';
        warningContainer.innerHTML = `
          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          ${res.message}
        `;
        warningContainer.classList.remove('hidden');
      }
    } catch (e) {
      console.error('Conflict check error:', e);
    }
  }

  switchRoom(roomId) {
    const sel = document.getElementById('booking-room-id');
    if (sel) {
      sel.value = roomId;
      this.triggerConflictCheck();
    }
  }

  switchTime(start, end) {
    document.getElementById('booking-start-time').value = start;
    document.getElementById('booking-end-time').value = end;
    this.triggerConflictCheck();
  }

  async submitBooking() {
    const roomId = parseInt(document.getElementById('booking-room-id').value, 10);
    const title = document.getElementById('booking-title').value.trim();
    const dateStr = document.getElementById('booking-date').value;
    const startTimeStr = document.getElementById('booking-start-time').value;
    const endTimeStr = document.getElementById('booking-end-time').value;
    const attendees = parseInt(document.getElementById('booking-attendees').value, 10);
    const organizerName = document.getElementById('booking-organizer-name').value.trim();
    const organizerContact = document.getElementById('booking-organizer-contact').value.trim();
    const description = document.getElementById('booking-description').value.trim();

    if (!roomId || !title || !dateStr || !startTimeStr || !endTimeStr || !attendees || !organizerName) {
      window.alerts.toast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', '', 'error');
      return;
    }

    const selectedEquipment = Array.from(
      document.querySelectorAll('#booking-equipment-container input[type="checkbox"]:checked')
    ).map(cb => parseInt(cb.value, 10));

    const participantRows = document.querySelectorAll('#booking-participants-list > div');
    const participants = [];
    participantRows.forEach(row => {
      const name = row.querySelector('.participant-name').value.trim();
      const email = row.querySelector('.participant-email').value.trim();
      const role = row.querySelector('.participant-role').value;
      if (name && email) {
        participants.push({ name, email, role });
      }
    });

    const payload = {
      room_id: roomId,
      title,
      description,
      start_time: `${dateStr}T${startTimeStr}:00`,
      end_time: `${dateStr}T${endTimeStr}:00`,
      attendees_count: attendees,
      organizer_name: organizerName,
      organizer_contact: organizerContact,
      equipment_ids: selectedEquipment,
      participants
    };

    try {
      if (this.editingBookingId) {
        await window.api.bookings.update(this.editingBookingId, payload);
        window.alerts.toast('แก้ไขข้อมูลการจองสำเร็จ', '', 'success');
      } else {
        const res = await window.api.bookings.create(payload);
        window.alerts.toast('จองห้องประชุมสำเร็จ', `รหัสการจอง: ${res.booking_code}`, 'success');
      }
      document.getElementById('booking-modal').classList.add('hidden');
      window.dispatchEvent(new CustomEvent('rooms:refresh'));
      window.dispatchEvent(new CustomEvent('calendar:refresh'));
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
      window.dispatchEvent(new CustomEvent('bookings:refresh'));
    } catch (err) {
      window.alerts.toast('ไม่สามารถจองห้องประชุมได้', err.message, 'error');
    }
  }

  async viewDetails(bookingId) {
    try {
      const booking = await window.api.bookings.get(bookingId);
      const modal = document.getElementById('booking-detail-modal');
      const content = document.getElementById('booking-detail-content');

      const userRole = (window.app.currentUser?.role?.name || '').toLowerCase();
      const curUserId = window.app.currentUser?.id;
      const isStaffOrAdmin = userRole === 'admin' || userRole === 'manager';
      const isOwner = booking.user_id === curUserId;

      const participantsHtml = booking.participants.length > 0
        ? booking.participants.map(p => `
            <div class="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
              <span class="font-medium text-slate-800">${p.name} <span class="text-slate-400 font-normal">(${p.email})</span></span>
              <span class="px-2 py-0.5 rounded text-[10px] ${p.role === 'host' ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-600'}">${p.role === 'host' ? 'ประธาน' : 'ผู้เข้าร่วม'}</span>
            </div>
          `).join('')
        : '<p class="text-xs text-slate-400">ไม่มีรายชื่อผู้เข้าร่วมเพิ่มเติม</p>';

      const equipmentHtml = booking.equipment_names.length > 0
        ? booking.equipment_names.map(name => `<span class="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">${name}</span>`).join(' ')
        : '<span class="text-xs text-slate-400">ไม่ได้ขออุปกรณ์พิเศษ</span>';

      content.innerHTML = `
        <div class="space-y-4">
          <!-- Header -->
          <div class="flex items-start justify-between border-b pb-3">
            <div>
              <span class="font-mono text-xs text-slate-400">${booking.booking_code}</span>
              <h2 class="text-xl font-bold text-slate-900 mt-0.5">${booking.title}</h2>
              <p class="text-xs text-slate-500 mt-0.5">จองโดย: ${booking.user_name} (${booking.organizer_name})</p>
            </div>
            <div>
              ${window.formatters.getBookingStatusBadge(booking.status)}
            </div>
          </div>

          <!-- Room and Time -->
          <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <p class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">ห้องประชุม</p>
              <h4 class="font-bold text-sm text-slate-900 mt-0.5">${booking.room_name}</h4>
              <p class="text-xs text-slate-500">${booking.building} &bull; ${booking.floor}</p>
            </div>
            <div>
              <p class="text-[11px] uppercase font-bold text-slate-400 tracking-wider">วันและเวลา</p>
              <h4 class="font-bold text-sm text-slate-900 mt-0.5">${window.formatters.formatDateThai(booking.start_time)}</h4>
              <p class="text-xs text-slate-600 font-medium">${window.formatters.formatTimeRange(booking.start_time, booking.end_time)}</p>
            </div>
          </div>

          <!-- Description -->
          ${booking.description ? `
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">รายละเอียดการประชุม</p>
              <p class="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 leading-relaxed">${booking.description}</p>
            </div>
          ` : ''}

          <!-- Equipment -->
          <div>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">อุปกรณ์ที่ขอใช้งาน</p>
            <div class="flex flex-wrap gap-1.5">${equipmentHtml}</div>
          </div>

          <!-- Participants -->
          <div>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ผู้เข้าร่วม (${booking.attendees_count} คน)</p>
            <div class="bg-white p-2.5 rounded border border-slate-200 space-y-1">${participantsHtml}</div>
          </div>

          <!-- Rejection Reason if any -->
          ${booking.rejection_reason ? `
            <div class="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              <span class="font-bold block mb-0.5">เหตุผลการปฏิเสธ / ยกเลิก:</span>
              ${booking.rejection_reason}
            </div>
          ` : ''}

          <!-- Action Buttons -->
          <div class="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button onclick="document.getElementById('booking-detail-modal').classList.add('hidden')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition">
              ปิด
            </button>

            <div class="flex items-center gap-2">
              ${isStaffOrAdmin && booking.status === 'pending' ? `
                <button onclick="window.bookingModal.approveBooking(${booking.id})" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition">
                  อนุมัติการจอง
                </button>
                <button onclick="window.bookingModal.promptRejectBooking(${booking.id})" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition">
                  ปฏิเสธการจอง
                </button>
              ` : ''}

              ${(isOwner || isStaffOrAdmin) && ['pending', 'approved'].includes(booking.status) ? `
                <button onclick="window.bookingModal.cancelBooking(${booking.id})" class="px-4 py-2 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium transition">
                  ยกเลิกการจอง
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
    } catch (e) {
      window.alerts.toast('ไม่สามารถเปิดดูรายละเอียดการจองได้', e.message, 'error');
    }
  }

  async approveBooking(bookingId) {
    try {
      await window.api.bookings.approve(bookingId);
      window.alerts.toast('อนุมัติการจองเรียบร้อยแล้ว', '', 'success');
      document.getElementById('booking-detail-modal').classList.add('hidden');
      window.dispatchEvent(new CustomEvent('rooms:refresh'));
      window.dispatchEvent(new CustomEvent('calendar:refresh'));
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
      window.dispatchEvent(new CustomEvent('bookings:refresh'));
    } catch (err) {
      window.alerts.toast('ไม่สามารถอนุมัติได้', err.message, 'error');
    }
  }

  async promptRejectBooking(bookingId) {
    const reason = prompt('กรุณาระบุเหตุผลการปฏิเสธการจอง:');
    if (reason === null) return;
    try {
      await window.api.bookings.reject(bookingId, reason || 'ไม่ผ่านการพิจารณา');
      window.alerts.toast('ปฏิเสธการจองแล้ว', '', 'info');
      document.getElementById('booking-detail-modal').classList.add('hidden');
      window.dispatchEvent(new CustomEvent('rooms:refresh'));
      window.dispatchEvent(new CustomEvent('calendar:refresh'));
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
      window.dispatchEvent(new CustomEvent('bookings:refresh'));
    } catch (err) {
      window.alerts.toast('ไม่สามารถปฏิเสธการจองได้', err.message, 'error');
    }
  }

  async cancelBooking(bookingId) {
    const ok = await window.alerts.confirm(
      'ยืนยันการยกเลิกการจอง',
      'คุณต้องการยกเลิกการจองห้องประชุมนี้ใช่หรือไม่?',
      'ยกเลิกการจอง',
      'ไม่ยกเลิก',
      true
    );
    if (!ok) return;

    try {
      await window.api.bookings.cancel(bookingId, 'ผู้ใช้กดยกเลิก');
      window.alerts.toast('ยกเลิกการจองเรียบร้อยแล้ว', '', 'success');
      document.getElementById('booking-detail-modal').classList.add('hidden');
      window.dispatchEvent(new CustomEvent('rooms:refresh'));
      window.dispatchEvent(new CustomEvent('calendar:refresh'));
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
      window.dispatchEvent(new CustomEvent('bookings:refresh'));
    } catch (err) {
      window.alerts.toast('ไม่สามารถยกเลิกการจองได้', err.message, 'error');
    }
  }
}

window.bookingModal = new BookingModalController();

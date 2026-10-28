// Meeting Rooms View
class RoomsView {
  constructor() {
    this.roomsData = [];
    this.equipmentList = [];
  }

  async render() {
    const container = document.getElementById('view-content');
    const userRole = (window.app.currentUser?.role?.name || '').toLowerCase();
    const isAdmin = userRole === 'admin';
    const isStaffOrAdmin = userRole === 'admin' || userRole === 'manager';

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header & Action Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">ห้องประชุมทั้งหมด (Meeting Rooms)</h1>
            <p class="text-sm text-slate-500 mt-0.5">เลือกห้องประชุมที่ตรงกับความต้องการและตรวจสอบสถานะแบบ Real-time</p>
          </div>
          ${isAdmin ? `
            <button onclick="window.roomsView.openRoomModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              เพิ่มห้องประชุมใหม่
            </button>
          ` : ''}
        </div>

        <!-- Filter Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <!-- Search -->
            <div class="relative">
              <input type="text" id="rooms-search" placeholder="ค้นหาชื่อห้อง, อาคาร..." class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" oninput="window.roomsView.applyFilters()">
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>

            <!-- Status Filter -->
            <div>
              <select id="rooms-filter-status" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" onchange="window.roomsView.applyFilters()">
                <option value="">ทุกสถานะ (All Status)</option>
                <option value="available">🟢 ว่าง (Available)</option>
                <option value="occupied">🔴 กำลังใช้งาน (Occupied)</option>
                <option value="reserved">🟡 จองแล้ว (Reserved)</option>
                <option value="maintenance">⚫ ปิดปรับปรุง (Maintenance)</option>
              </select>
            </div>

            <!-- Capacity Filter -->
            <div>
              <select id="rooms-filter-capacity" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" onchange="window.roomsView.applyFilters()">
                <option value="">ทุกขนาดความจุ (Capacity)</option>
                <option value="4">อย่างน้อย 4 คน</option>
                <option value="10">อย่างน้อย 10 คน</option>
                <option value="16">อย่างน้อย 16 คน</option>
                <option value="30">อย่างน้อย 30 คนขึ้นไป</option>
              </select>
            </div>

            <!-- Building Filter -->
            <div>
              <select id="rooms-filter-building" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" onchange="window.roomsView.applyFilters()">
                <option value="">ทุกอาคาร (All Buildings)</option>
                <option value="อาคาร A (Executive Tower)">อาคาร A (Executive Tower)</option>
                <option value="อาคาร B (Tech Center)">อาคาร B (Tech Center)</option>
                <option value="อาคาร C (Creative Studio)">อาคาร C (Creative Studio)</option>
              </select>
            </div>

            <!-- Reset Filter -->
            <div>
              <button onclick="window.roomsView.resetFilters()" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        </div>

        <!-- Room Cards Grid -->
        <div id="rooms-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <p class="col-span-full text-center py-12 text-slate-400">กำลังโหลดรายการห้องประชุม...</p>
        </div>
      </div>
    `;

    await this.loadRooms();
  }

  async loadRooms() {
    try {
      const [rooms, equipment] = await Promise.all([
        window.api.rooms.getAll(),
        window.api.rooms.getEquipment()
      ]);
      this.roomsData = rooms;
      this.equipmentList = equipment;
      this.renderCards(this.roomsData);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      window.alerts.toast('ไม่สามารถโหลดรายการห้องประชุมได้', err.message, 'error');
    }
  }

  applyFilters() {
    const search = document.getElementById('rooms-search')?.value.toLowerCase().trim() || '';
    const status = document.getElementById('rooms-filter-status')?.value || '';
    const capacityMin = parseInt(document.getElementById('rooms-filter-capacity')?.value || '0', 10);
    const building = document.getElementById('rooms-filter-building')?.value || '';

    const filtered = this.roomsData.filter(r => {
      if (search && !r.name.toLowerCase().includes(search) && !r.code.toLowerCase().includes(search) && !r.building.toLowerCase().includes(search)) {
        return false;
      }
      if (status && r.status.toLowerCase() !== status.toLowerCase()) {
        return false;
      }
      if (capacityMin && r.capacity < capacityMin) {
        return false;
      }
      if (building && r.building !== building) {
        return false;
      }
      return true;
    });

    this.renderCards(filtered);
  }

  resetFilters() {
    if (document.getElementById('rooms-search')) document.getElementById('rooms-search').value = '';
    if (document.getElementById('rooms-filter-status')) document.getElementById('rooms-filter-status').value = '';
    if (document.getElementById('rooms-filter-capacity')) document.getElementById('rooms-filter-capacity').value = '';
    if (document.getElementById('rooms-filter-building')) document.getElementById('rooms-filter-building').value = '';
    this.renderCards(this.roomsData);
  }

  renderCards(rooms) {
    const grid = document.getElementById('rooms-cards-grid');
    if (!grid) return;

    if (!rooms || rooms.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          <h3 class="text-base font-semibold text-slate-700">ไม่พบห้องประชุมที่ตรงกับเงื่อนไข</h3>
          <p class="text-sm text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองของคุณใหม่</p>
        </div>
      `;
      return;
    }

    const userRole = (window.app.currentUser?.role?.name || '').toLowerCase();
    const isAdmin = userRole === 'admin';
    const isStaffOrAdmin = userRole === 'admin' || userRole === 'manager';

    grid.innerHTML = rooms.map(room => {
      const isMaint = room.status === 'maintenance';
      const equipmentBadges = room.equipment.map(eq => `
        <span class="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          ${eq.name}
        </span>
      `).join('');

      return `
        <div class="room-card bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
          <!-- Room Image & Status Overlay -->
          <div class="relative h-48 w-full bg-slate-800">
            <img src="${room.image_url || 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=600'}" alt="${room.name}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
            
            <div class="absolute top-3 left-3">
              <span class="px-2.5 py-1 bg-slate-900/80 backdrop-blur-md text-white font-mono text-xs rounded-md border border-white/20">${room.code}</span>
            </div>

            <div class="absolute top-3 right-3">
              ${window.formatters.getRoomStatusBadge(room.status)}
            </div>

            <div class="absolute bottom-3 left-3 right-3 text-white">
              <h3 class="font-bold text-lg leading-tight drop-shadow-sm">${room.name}</h3>
              <p class="text-xs text-slate-200 flex items-center gap-1 mt-0.5">
                <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                ${room.building} &bull; ${room.floor}
              </p>
            </div>
          </div>

          <!-- Room Details Body -->
          <div class="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span class="text-slate-500 flex items-center gap-1.5 font-medium">
                  <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  ความจุรองรับ:
                </span>
                <span class="font-bold text-slate-900">${room.capacity} ที่นั่ง</span>
              </div>

              <p class="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">${room.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>

              <!-- Equipment Tags -->
              <div class="mt-3">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">อุปกรณ์ประจำห้อง</p>
                <div class="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                  ${equipmentBadges.length > 0 ? equipmentBadges : '<span class="text-xs text-slate-400">ไม่มีข้อมูลอุปกรณ์</span>'}
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button 
                onclick="window.bookingModal.openModal(${room.id})" 
                class="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition ${isMaint ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'}"
                ${isMaint ? 'disabled title="ห้องปิดปรับปรุง"' : ''}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                ${isMaint ? 'ปิดปรับปรุง' : 'จองห้องนี้'}
              </button>

              <button onclick="window.roomsView.openScheduleModal(${room.id})" class="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm transition" title="ดูตารางเวลาว่าง">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </button>

              ${isStaffOrAdmin ? `
                <div class="relative inline-block text-left">
                  <button onclick="window.roomsView.toggleCardMenu(${room.id})" class="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition" title="จัดการ">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                  </button>
                  <div id="card-menu-${room.id}" class="hidden absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-20 text-xs">
                    ${isAdmin ? `
                      <a href="javascript:void(0)" onclick="window.roomsView.openRoomModal(${room.id})" class="block px-4 py-2 text-slate-700 hover:bg-slate-50">แก้ไขข้อมูลห้อง</a>
                    ` : ''}
                    <a href="javascript:void(0)" onclick="window.roomsView.toggleStatusPrompt(${room.id}, '${room.status}')" class="block px-4 py-2 text-slate-700 hover:bg-slate-50">
                      เปลี่ยนสถานะ (${room.status === 'maintenance' ? 'เปิดใช้งาน' : 'ปิดปรับปรุง'})
                    </a>
                    ${isAdmin ? `
                      <a href="javascript:void(0)" onclick="window.roomsView.deleteRoom(${room.id})" class="block px-4 py-2 text-rose-600 hover:bg-rose-50 font-medium">ลบห้องประชุม</a>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  toggleCardMenu(roomId) {
    const menu = document.getElementById(`card-menu-${roomId}`);
    if (menu) {
      const isHidden = menu.classList.contains('hidden');
      document.querySelectorAll('[id^="card-menu-"]').forEach(m => m.classList.add('hidden'));
      if (isHidden) menu.classList.remove('hidden');
    }
  }

  async openScheduleModal(roomId) {
    try {
      const data = await window.api.rooms.getAvailability(roomId);
      const modal = document.getElementById('room-schedule-modal');
      const content = document.getElementById('room-schedule-content');

      let slotsHtml = '';
      if (!data.booked_slots || data.booked_slots.length === 0) {
        slotsHtml = '<p class="text-sm text-emerald-600 bg-emerald-50 p-4 rounded-lg text-center font-medium">วันนี้ยังไม่มีการจองห้องนี้ ห้องว่างตลอดทั้งวัน</p>';
      } else {
        slotsHtml = `
          <div class="space-y-2">
            ${data.booked_slots.map(b => `
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-semibold text-slate-900">${b.title}</h4>
                  <p class="text-xs text-slate-500">${b.organizer_name} &bull; ${window.formatters.formatTimeRange(b.start_time, b.end_time)}</p>
                </div>
                ${window.formatters.getBookingStatusBadge(b.status)}
              </div>
            `).join('')}
          </div>
        `;
      }

      content.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b pb-3">
            <div>
              <h3 class="font-bold text-lg text-slate-900">${data.room_name}</h3>
              <p class="text-xs text-slate-500">ตารางการจองประจำวันที่ ${window.formatters.formatDateThai(data.date)}</p>
            </div>
            ${data.is_maintenance ? '<span class="px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-600 font-semibold">ปิดปรับปรุง</span>' : ''}
          </div>
          ${slotsHtml}
          <div class="pt-2 text-right">
            <button onclick="document.getElementById('room-schedule-modal').classList.add('hidden')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">ปิด</button>
          </div>
        </div>
      `;
      modal.classList.remove('hidden');
    } catch (e) {
      window.alerts.toast('ไม่สามารถโหลดตารางเวลาได้', e.message, 'error');
    }
  }

  async toggleStatusPrompt(roomId, currentStatus) {
    const newStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    const label = newStatus === 'maintenance' ? 'ปิดปรับปรุง' : 'เปิดใช้งานตามปกติ';
    const ok = await window.alerts.confirm(
      'ยืนยันเปลี่ยนสถานะห้อง',
      `คุณต้องการเปลี่ยนสถานะห้องนี้เป็น "${label}" ใช่หรือไม่?`
    );
    if (!ok) return;

    try {
      await window.api.rooms.changeStatus(roomId, newStatus);
      window.alerts.toast('เปลี่ยนสถานะห้องสำเร็จ', `สถานะเปลี่ยนเป็น ${label} แล้ว`, 'success');
      await this.loadRooms();
    } catch (err) {
      window.alerts.toast('ไม่สามารถเปลี่ยนสถานะได้', err.message, 'error');
    }
  }

  async deleteRoom(roomId) {
    const ok = await window.alerts.confirm(
      'ยืนยันการลบห้องประชุม',
      'คุณแน่ใจหรือไม่ว่าต้องการลบห้องประชุมนี้? ข้อมูลการจองในอดีตจะยังคงถูกบันทึกไว้',
      'ลบห้อง',
      'ยกเลิก',
      true
    );
    if (!ok) return;

    try {
      await window.api.rooms.delete(roomId);
      window.alerts.toast('ลบห้องประชุมสำเร็จ', '', 'success');
      await this.loadRooms();
    } catch (err) {
      window.alerts.toast('ไม่สามารถลบห้องประชุมได้', err.message, 'error');
    }
  }

  openRoomModal(roomId = null) {
    const modal = document.getElementById('room-edit-modal');
    const form = document.getElementById('room-edit-form');
    const titleEl = document.getElementById('room-edit-modal-title');

    form.reset();
    document.getElementById('room-edit-id').value = roomId || '';

    // Populate equipment checkboxes
    const eqContainer = document.getElementById('room-edit-equipment-container');
    eqContainer.innerHTML = this.equipmentList.map(eq => `
      <label class="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
        <input type="checkbox" name="equipment" value="${eq.id}" class="rounded text-blue-600 focus:ring-blue-500">
        ${eq.name}
      </label>
    `).join('');

    if (roomId) {
      titleEl.textContent = 'แก้ไขห้องประชุม';
      const room = this.roomsData.find(r => r.id === roomId);
      if (room) {
        document.getElementById('room-edit-code').value = room.code;
        document.getElementById('room-edit-name').value = room.name;
        document.getElementById('room-edit-building').value = room.building;
        document.getElementById('room-edit-floor').value = room.floor;
        document.getElementById('room-edit-capacity').value = room.capacity;
        document.getElementById('room-edit-description').value = room.description || '';
        document.getElementById('room-edit-image').value = room.image_url || '';
        document.getElementById('room-edit-status').value = room.status;

        // Check assigned equipment
        const assignedIds = room.equipment.map(e => e.id);
        eqContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = assignedIds.includes(parseInt(cb.value, 10));
        });
      }
    } else {
      titleEl.textContent = 'เพิ่มห้องประชุมใหม่';
      document.getElementById('room-edit-code').value = `RM-${Math.floor(100 + Math.random() * 900)}`;
      document.getElementById('room-edit-status').value = 'available';
    }

    modal.classList.remove('hidden');
  }

  async saveRoom() {
    const id = document.getElementById('room-edit-id').value;
    const code = document.getElementById('room-edit-code').value.trim();
    const name = document.getElementById('room-edit-name').value.trim();
    const building = document.getElementById('room-edit-building').value.trim();
    const floor = document.getElementById('room-edit-floor').value.trim();
    const capacity = parseInt(document.getElementById('room-edit-capacity').value, 10);
    const description = document.getElementById('room-edit-description').value.trim();
    const imageUrl = document.getElementById('room-edit-image').value.trim();
    const status = document.getElementById('room-edit-status').value;

    const selectedEquipment = Array.from(
      document.querySelectorAll('#room-edit-equipment-container input[type="checkbox"]:checked')
    ).map(cb => parseInt(cb.value, 10));

    if (!code || !name || !building || !floor || !capacity) {
      window.alerts.toast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', '', 'error');
      return;
    }

    const payload = {
      code,
      name,
      building,
      floor,
      capacity,
      description,
      image_url: imageUrl || 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800',
      status,
      equipment_ids: selectedEquipment,
      is_active: true
    };

    try {
      if (id) {
        await window.api.rooms.update(id, payload);
        window.alerts.toast('แก้ไขห้องประชุมสำเร็จ', '', 'success');
      } else {
        await window.api.rooms.create(payload);
        window.alerts.toast('สร้างห้องประชุมใหม่สำเร็จ', '', 'success');
      }
      document.getElementById('room-edit-modal').classList.add('hidden');
      await this.loadRooms();
    } catch (err) {
      window.alerts.toast('ไม่สามารถบันทึกข้อมูลห้องได้', err.message, 'error');
    }
  }
}

window.roomsView = new RoomsView();

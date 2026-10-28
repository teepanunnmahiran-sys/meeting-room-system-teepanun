// Formatters for Dates, Status Badges, and Utilities
window.formatters = {
  formatDateThai(dateString, withTime = false) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Buddhist Era
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (withTime) {
      return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
    }
    return `${day} ${month} ${year}`;
  },

  formatTimeRange(startStr, endStr) {
    if (!startStr || !endStr) return '-';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const sH = String(start.getHours()).padStart(2, '0');
    const sM = String(start.getMinutes()).padStart(2, '0');
    const eH = String(end.getHours()).padStart(2, '0');
    const eM = String(end.getMinutes()).padStart(2, '0');
    return `${sH}:${sM} - ${eH}:${eM} น.`;
  },

  getRoomStatusBadge(status) {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'available':
        return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold badge-available"><span class="w-2 h-2 rounded-full status-dot-available"></span>ว่าง (Available)</span>';
      case 'occupied':
        return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold badge-occupied"><span class="w-2 h-2 rounded-full status-dot-occupied"></span>กำลังใช้งาน (Occupied)</span>';
      case 'reserved':
        return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold badge-reserved"><span class="w-2 h-2 rounded-full status-dot-reserved"></span>จองแล้ว (Reserved)</span>';
      case 'maintenance':
        return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold badge-maintenance"><span class="w-2 h-2 rounded-full status-dot-maintenance"></span>ปิดปรับปรุง (Maintenance)</span>';
      default:
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">${status}</span>`;
    }
  },

  getBookingStatusBadge(status) {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
        return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">อนุมัติแล้ว</span>';
      case 'pending':
        return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">รออนุมัติ</span>';
      case 'completed':
        return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">เสร็จสิ้น</span>';
      case 'cancelled':
        return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">ยกเลิกแล้ว</span>';
      case 'rejected':
        return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">ไม่อนุมัติ</span>';
      default:
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">${status}</span>`;
    }
  },

  getRoleBadge(roleName) {
    const r = (roleName || '').toLowerCase();
    if (r === 'admin') {
      return '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">Admin</span>';
    } else if (r === 'manager') {
      return '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">Manager / Staff</span>';
    } else {
      return '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">User</span>';
    }
  }
};

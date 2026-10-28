// Central Application Controller
class App {
  constructor() {
    this.currentUser = null;
    this.currentView = 'dashboard';
    this.unreadNotificationsCount = 0;
  }

  async init() {
    console.log('🚀 Initializing Meeting Room Booking Platform...');

    // Setup global listeners
    window.addEventListener('auth:required', () => this.showLoginModal());
    window.addEventListener('rooms:refresh', () => {
      if (this.currentView === 'rooms') window.roomsView.loadRooms();
    });
    window.addEventListener('calendar:refresh', () => {
      if (this.currentView === 'calendar') window.calendarView.refetchEvents();
    });
    window.addEventListener('dashboard:refresh', () => {
      if (this.currentView === 'dashboard') window.dashboardView.loadData();
    });
    window.addEventListener('bookings:refresh', () => {
      if (this.currentView === 'my-bookings') window.myBookingsView.loadData();
      if (this.currentView === 'all-bookings') window.allBookingsView.loadData();
    });

    // Check existing auth token
    if (window.api.token) {
      try {
        const user = await window.api.auth.getMe();
        this.setUser(user);
      } catch (err) {
        console.warn('Saved token invalid, showing login modal.');
        this.showLoginModal();
      }
    } else {
      this.showLoginModal();
    }
  }

  setUser(user) {
    this.currentUser = user;
    localStorage.setItem('meeting_user_profile', JSON.stringify(user));

    // Update Header Profile
    document.getElementById('header-user-name').textContent = user.name;
    document.getElementById('header-user-role').textContent = user.role.name.toUpperCase();
    if (user.avatar_url) {
      document.getElementById('header-user-avatar').src = user.avatar_url;
    }

    // Hide Login Modal
    document.getElementById('login-modal').classList.add('hidden');

    // Update Navigation links visibility based on role
    this.updateNavigationByRole();

    // Connect WebSocket
    window.ws.connect();

    // Load notification count
    this.loadNotificationsBadge();

    // Update Live room status ticker in header
    this.updateLiveRoomTicker();

    // Navigate to initial view
    this.navigate(this.currentView);
  }

  updateNavigationByRole() {
    const role = (this.currentUser?.role?.name || '').toLowerCase();
    const isStaffOrAdmin = role === 'admin' || role === 'manager';
    const isAdmin = role === 'admin';

    // Staff/Admin menus
    document.querySelectorAll('.staff-only-nav').forEach(el => {
      el.classList.toggle('hidden', !isStaffOrAdmin);
    });

    // Admin only menus
    document.querySelectorAll('.admin-only-nav').forEach(el => {
      el.classList.toggle('hidden', !isAdmin);
    });
  }

  navigate(viewName) {
    this.currentView = viewName;

    // Update Sidebar active state
    document.querySelectorAll('.nav-link').forEach(link => {
      const target = link.getAttribute('data-view');
      if (target === viewName) {
        link.className = 'nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white shadow-sm transition';
      } else {
        link.className = 'nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition';
      }
    });

    // Close mobile drawer if open
    const drawer = document.getElementById('mobile-drawer');
    if (drawer && !drawer.classList.contains('hidden')) {
      drawer.classList.add('hidden');
    }

    // Render corresponding view
    switch (viewName) {
      case 'dashboard':
        window.dashboardView.render();
        break;
      case 'rooms':
        window.roomsView.render();
        break;
      case 'calendar':
        window.calendarView.render();
        break;
      case 'my-bookings':
        window.myBookingsView.render();
        break;
      case 'all-bookings':
        window.allBookingsView.render();
        break;
      case 'reports':
        window.reportsView.render();
        break;
      case 'users':
        window.usersView.render();
        break;
      case 'logs':
        window.auditLogsView.render();
        break;
      default:
        window.dashboardView.render();
    }
  }

  async updateLiveRoomTicker() {
    try {
      const summary = await window.api.dashboard.getSummary();
      const pill = document.getElementById('header-room-status-pill');
      if (pill) {
        pill.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>ว่าง ${summary.available_rooms} / ${summary.total_rooms} ห้อง</span>
        `;
      }
    } catch (e) {
      // quiet fail
    }
  }

  async loadNotificationsBadge() {
    try {
      const data = await window.api.notifications.getAll();
      this.unreadNotificationsCount = data.unread_count;
      const badge = document.getElementById('notification-badge');
      if (badge) {
        if (data.unread_count > 0) {
          badge.textContent = data.unread_count > 9 ? '9+' : data.unread_count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    } catch (e) {}
  }

  toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      this.populateNotificationsList();
      dropdown.classList.remove('hidden');
    } else {
      dropdown.classList.add('hidden');
    }
  }

  async populateNotificationsList() {
    const container = document.getElementById('notification-list-container');
    try {
      const data = await window.api.notifications.getAll();
      if (!data.notifications || data.notifications.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">ไม่มีการแจ้งเตือนใหม่</p>';
        return;
      }

      container.innerHTML = data.notifications.map(n => `
        <div class="p-3 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer flex items-start justify-between gap-2 ${n.is_read ? 'opacity-70' : 'bg-blue-50/40'}" onclick="window.app.markNotificationRead(${n.id})">
          <div>
            <h5 class="text-xs font-bold text-slate-900">${n.title}</h5>
            <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">${n.message}</p>
            <span class="text-[10px] text-slate-400 mt-1 block">${window.formatters.formatDateThai(n.created_at, true)}</span>
          </div>
          ${!n.is_read ? '<span class="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0"></span>' : ''}
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">ไม่สามารถโหลดการแจ้งเตือนได้</p>';
    }
  }

  async markNotificationRead(id) {
    try {
      await window.api.notifications.markRead(id);
      this.loadNotificationsBadge();
      this.populateNotificationsList();
    } catch (e) {}
  }

  async markAllNotificationsRead() {
    try {
      await window.api.notifications.markAllRead();
      this.loadNotificationsBadge();
      this.populateNotificationsList();
      window.alerts.toast('อ่านทั้งหมดแล้ว', '', 'info');
    } catch (e) {}
  }

  showLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.remove('hidden');
  }

  async handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember').checked;
    const errBox = document.getElementById('login-error-message');

    errBox.classList.add('hidden');
    errBox.textContent = '';

    try {
      const res = await window.api.auth.login(email, password, remember);
      window.api.setToken(res.access_token, remember);
      this.setUser(res.user);
      window.alerts.toast('เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับคุณ ${res.user.name}`, 'success');
    } catch (err) {
      errBox.textContent = err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      errBox.classList.remove('hidden');
    }
  }

  quickDemoLogin(role) {
    if (role === 'admin') {
      document.getElementById('login-email').value = 'admin@company.com';
      document.getElementById('login-password').value = 'admin1234';
    } else if (role === 'manager') {
      document.getElementById('login-email').value = 'manager@company.com';
      document.getElementById('login-password').value = 'manager1234';
    } else {
      document.getElementById('login-email').value = 'user@company.com';
      document.getElementById('login-password').value = 'user1234';
    }
    document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
  }

  async logout() {
    const ok = await window.alerts.confirm(
      'ยืนยันออกจากระบบ',
      'คุณต้องการออกจากระบบห้องประชุมใช่หรือไม่?',
      'ออกจากระบบ',
      'ยกเลิก',
      false
    );
    if (!ok) return;

    try {
      await window.api.auth.logout();
    } catch (e) {}
    window.api.clearToken();
    window.location.reload();
  }

  toggleUserDropdown() {
    const dropdown = document.getElementById('user-profile-dropdown');
    dropdown.classList.toggle('hidden');
  }

  openProfileModal() {
    document.getElementById('user-profile-dropdown').classList.add('hidden');
    const modal = document.getElementById('profile-modal');
    const u = this.currentUser;
    if (u) {
      document.getElementById('profile-name').value = u.name;
      document.getElementById('profile-email').value = u.email;
      document.getElementById('profile-phone').value = u.phone || '';
      document.getElementById('profile-role').value = u.role.name.toUpperCase();
      document.getElementById('profile-dept').value = u.department?.name || 'ไม่ระบุ';
    }
    modal.classList.remove('hidden');
  }

  async saveProfile(event) {
    event.preventDefault();
    const name = document.getElementById('profile-name').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();

    try {
      const updated = await window.api.auth.updateProfile({ name, phone });
      this.currentUser = updated;
      document.getElementById('header-user-name').textContent = updated.name;
      window.alerts.toast('บันทึกข้อมูลส่วนตัวสำเร็จ', '', 'success');
      document.getElementById('profile-modal').classList.add('hidden');
    } catch (err) {
      window.alerts.toast('ไม่สามารถบันทึกข้อมูลได้', err.message, 'error');
    }
  }

  async handlePasswordChange(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('pwd-current').value;
    const newPassword = document.getElementById('pwd-new').value;
    const confirmPassword = document.getElementById('pwd-confirm').value;

    if (newPassword !== confirmPassword) {
      window.alerts.toast('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', '', 'error');
      return;
    }

    try {
      await window.api.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      window.alerts.toast('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว', '', 'success');
      document.getElementById('change-pwd-form').reset();
    } catch (err) {
      window.alerts.toast('ไม่สามารถเปลี่ยนรหัสผ่านได้', err.message, 'error');
    }
  }
}

window.app = new App();
document.addEventListener('DOMContentLoaded', () => window.app.init());

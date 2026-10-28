// Enterprise Meeting Room Booking API Client
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('meeting_auth_token') || sessionStorage.getItem('meeting_auth_token') || null;
  }

  setToken(token, remember = false) {
    this.token = token;
    if (remember) {
      localStorage.setItem('meeting_auth_token', token);
      sessionStorage.removeItem('meeting_auth_token');
    } else {
      sessionStorage.setItem('meeting_auth_token', token);
      localStorage.removeItem('meeting_auth_token');
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('meeting_auth_token');
    sessionStorage.removeItem('meeting_auth_token');
    localStorage.removeItem('meeting_user_profile');
  }

  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    const url = `${API_BASE}${endpoint}`;
    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        // Token expired or invalid
        this.clearToken();
        window.dispatchEvent(new CustomEvent('auth:required'));
        throw new Error('กรุณาเข้าสู่ระบบเพื่อใช้งานต่อ');
      }

      if (!response.ok) {
        let errDetail = 'เกิดข้อผิดพลาดในการร้องขอข้อมูล';
        try {
          const errData = await response.json();
          if (typeof errData.detail === 'string') {
            errDetail = errData.detail;
          } else if (errData.detail && typeof errData.detail.message === 'string') {
            errDetail = errData.detail.message;
          } else if (errData.detail) {
            errDetail = JSON.stringify(errData.detail);
          }
        } catch (e) {
          errDetail = response.statusText;
        }
        const error = new Error(errDetail);
        error.status = response.status;
        throw error;
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Auth
  auth = {
    login: (email, password, remember = false) =>
      this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, remember_me: remember })
      }),
    logout: () => this.request('/auth/logout', { method: 'POST' }),
    getMe: () => this.request('/auth/me'),
    updateProfile: (data) => this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data) => this.request('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),
    forgotPassword: (email) => this.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  };

  // Rooms
  rooms = {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/rooms${query ? `?${query}` : ''}`);
    },
    get: (id) => this.request(`/rooms/${id}`),
    getAvailability: (id, dateStr) => this.request(`/rooms/${id}/availability${dateStr ? `?target_date=${dateStr}` : ''}`),
    create: (data) => this.request('/rooms', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => this.request(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    changeStatus: (id, status) => this.request(`/rooms/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (id) => this.request(`/rooms/${id}`, { method: 'DELETE' }),
    getEquipment: () => this.request('/rooms/equipment'),
  };

  // Bookings
  bookings = {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/bookings${query ? `?${query}` : ''}`);
    },
    get: (id) => this.request(`/bookings/${id}`),
    checkConflict: (data) => this.request('/bookings/check-conflict', { method: 'POST', body: JSON.stringify(data) }),
    create: (data) => this.request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => this.request(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    cancel: (id, reason = '') => this.request(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    approve: (id) => this.request(`/bookings/${id}/approve`, { method: 'POST' }),
    reject: (id, reason) => this.request(`/bookings/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  };

  // Calendar
  calendar = {
    getEvents: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/calendar/events${query ? `?${query}` : ''}`);
    }
  };

  // Dashboard
  dashboard = {
    getSummary: () => this.request('/dashboard/summary'),
    getCharts: () => this.request('/dashboard/charts'),
    getUpcoming: () => this.request('/dashboard/upcoming'),
    getRecent: () => this.request('/dashboard/recent')
  };

  // Reports
  reports = {
    getSummary: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/reports/summary${query ? `?${query}` : ''}`);
    },
    exportUrl: (format, rangeType, startDate, endDate) => {
      let url = `${API_BASE}/reports/export?format=${format}&range_type=${rangeType}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      return url;
    }
  };

  // Users
  users = {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/users${query ? `?${query}` : ''}`);
    },
    getRoles: () => this.request('/users/roles'),
    getDepartments: () => this.request('/users/departments'),
    create: (data) => this.request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => this.request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleStatus: (id, status) => this.request(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    resetPassword: (id, newPassword) => this.request(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password: newPassword }) }),
  };

  // Notifications
  notifications = {
    getAll: () => this.request('/notifications'),
    markRead: (id) => this.request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => this.request('/notifications/mark-all-read', { method: 'POST' }),
  };

  // Audit Logs
  auditLogs = {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/audit-logs${query ? `?${query}` : ''}`);
    }
  };
}

window.api = new ApiClient();

// WebSocket Live Real-Time Synchronizer
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.reconnectInterval = 3000;
    this.pingInterval = null;
    this.isConnected = false;
  }

  connect() {
    const token = window.api.token;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws${token ? `?token=${token}` : ''}`;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnected = true;
        console.log('⚡ WebSocket Connected');
        this.updateConnectionPill(true);

        // Heartbeat
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send('ping');
          }
        }, 25000);
      };

      this.socket.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const payload = JSON.parse(event.data);
          this.handleEvent(payload);
        } catch (e) {
          console.warn('WS Message parsing error:', e);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.updateConnectionPill(false);
        clearInterval(this.pingInterval);
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.socket.onerror = (err) => {
        this.isConnected = false;
        this.updateConnectionPill(false);
      };
    } catch (e) {
      console.warn('WebSocket init failed:', e);
    }
  }

  updateConnectionPill(connected) {
    const pill = document.getElementById('ws-status-dot');
    if (pill) {
      pill.className = `w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`;
      pill.title = connected ? 'Real-time Live: เชื่อมต่อแล้ว' : 'Real-time Offline: กำลังเชื่อมต่อใหม่';
    }
  }

  handleEvent(payload) {
    const { type, data } = payload;
    console.log('⚡ Real-time Event:', type, data);

    // Global Event Dispatch
    window.dispatchEvent(new CustomEvent('ws:event', { detail: { type, data } }));

    switch (type) {
      case 'NOTIFICATION_RECEIVED':
        window.alerts.toast(data.title, data.message, 'info');
        window.app.loadNotificationsBadge();
        break;

      case 'BOOKING_CREATED':
        window.alerts.toast('มีการจองห้องใหม่', `หัวข้อ: ${data.title} (${data.room_name})`, 'info');
        window.dispatchEvent(new CustomEvent('rooms:refresh'));
        window.dispatchEvent(new CustomEvent('calendar:refresh'));
        window.dispatchEvent(new CustomEvent('dashboard:refresh'));
        break;

      case 'BOOKING_APPROVED':
        window.alerts.toast('การจองได้รับการอนุมัติ', `หัวข้อ: ${data.title}`, 'success');
        window.dispatchEvent(new CustomEvent('rooms:refresh'));
        window.dispatchEvent(new CustomEvent('calendar:refresh'));
        window.dispatchEvent(new CustomEvent('dashboard:refresh'));
        break;

      case 'BOOKING_REJECTED':
        window.alerts.toast('การจองถูกปฏิเสธ', `หัวข้อ: ${data.title}`, 'error');
        window.dispatchEvent(new CustomEvent('rooms:refresh'));
        window.dispatchEvent(new CustomEvent('calendar:refresh'));
        window.dispatchEvent(new CustomEvent('dashboard:refresh'));
        break;

      case 'BOOKING_CANCELLED':
        window.alerts.toast('การจองถูกยกเลิก', `หัวข้อ: ${data.title}`, 'warning');
        window.dispatchEvent(new CustomEvent('rooms:refresh'));
        window.dispatchEvent(new CustomEvent('calendar:refresh'));
        window.dispatchEvent(new CustomEvent('dashboard:refresh'));
        break;

      case 'ROOM_STATUS_CHANGED':
        window.dispatchEvent(new CustomEvent('rooms:refresh'));
        window.dispatchEvent(new CustomEvent('dashboard:refresh'));
        break;
    }
  }
}

window.ws = new WebSocketManager();

// Alert, Toast and Confirm Notification Utilities
class AlertManager {
  constructor() {
    this.toastContainer = null;
    this.ensureToastContainer();
  }

  ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none';
      document.body.appendChild(container);
    }
    this.toastContainer = container;
  }

  toast(title, message = '', type = 'info', duration = 4000) {
    this.ensureToastContainer();

    const toastEl = document.createElement('div');
    toastEl.className = 'pointer-events-auto bg-white border rounded-lg shadow-lg p-3.5 flex items-start gap-3 animate-toast';

    let iconSvg = '';
    let borderClass = 'border-slate-200';
    let iconBg = 'bg-blue-100 text-blue-600';

    if (type === 'success') {
      borderClass = 'border-emerald-200';
      iconBg = 'bg-emerald-100 text-emerald-600';
      iconSvg = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    } else if (type === 'error') {
      borderClass = 'border-rose-200';
      iconBg = 'bg-rose-100 text-rose-600';
      iconSvg = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    } else if (type === 'warning') {
      borderClass = 'border-amber-200';
      iconBg = 'bg-amber-100 text-amber-600';
      iconSvg = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    } else {
      borderClass = 'border-blue-200';
      iconBg = 'bg-blue-100 text-blue-600';
      iconSvg = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }

    toastEl.classList.add(...borderClass.split(' '));
    toastEl.innerHTML = `
      <div class="w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0">
        ${iconSvg}
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold text-slate-900 leading-snug">${title}</h4>
        ${message ? `<p class="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">${message}</p>` : ''}
      </div>
      <button class="text-slate-400 hover:text-slate-600 ml-1 p-0.5" onclick="this.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    this.toastContainer.appendChild(toastEl);

    setTimeout(() => {
      if (toastEl.parentElement) {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateY(10px)';
        toastEl.style.transition = 'all 0.25s ease';
        setTimeout(() => toastEl.remove(), 250);
      }
    }, duration);
  }

  confirm(title, message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', isDanger = false) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-message');
      const confirmBtn = document.getElementById('confirm-modal-ok');
      const cancelBtn = document.getElementById('confirm-modal-cancel');

      if (!modal) {
        resolve(window.confirm(`${title}\n${message}`));
        return;
      }

      titleEl.textContent = title;
      msgEl.textContent = message;
      confirmBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      if (isDanger) {
        confirmBtn.className = 'px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition';
      } else {
        confirmBtn.className = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition';
      }

      const cleanup = () => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
      };

      const onConfirm = () => {
        cleanup();
        resolve(true);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);

      modal.classList.remove('hidden');
    });
  }
}

window.alerts = new AlertManager();

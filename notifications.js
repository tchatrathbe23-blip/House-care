/**
 * HouseCare Live Notification System
 * Handles WebSocket connection, live notifications bell in navbar,
 * dropdown panel, unread counter badge, audio chime, and toasts.
 */
(function () {
  'use strict';

  let socket = null;
  let unreadCount = 0;
  let isPanelOpen = false;
  let soundEnabled = localStorage.getItem('housecare-notification-sound') !== 'false';
  let audioContext = null;

  // DOM Elements
  let wrapperEl = null;
  let bellBtn = null;
  let badgeEl = null;
  let panelEl = null;
  let listEl = null;
  let toastContainer = null;

  // Modern Audio Chime (Web Audio API)
  function playChime() {
    if (!soundEnabled) return;

    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gainNode);
      gainNode.connect(audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      // Audio policy catch
    }
  }

  // Toast UI
  function showToast(type, title, message) {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'hc-toast-container';
      document.body.appendChild(toastContainer);
    }

    // Limit to max 3 toasts
    while (toastContainer.children.length >= 3) {
      const oldest = toastContainer.lastElementChild;
      if (oldest) toastContainer.removeChild(oldest);
    }

    const toast = document.createElement('div');
    toast.className = `hc-toast ${type || 'info'}`;

    let iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
    if (type === 'success') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    }

    toast.innerHTML = `
      <div class="hc-toast-icon">${iconSvg}</div>
      <div class="hc-toast-body">
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
      <button class="hc-toast-close" aria-label="Close">&times;</button>
      <div class="hc-toast-progress"></div>
    `;

    toastContainer.prepend(toast);
    playChime();
    showBrowserNotification(title, message);

    const closeBtn = toast.querySelector('.hc-toast-close');
    let timeout;

    const dismiss = () => {
      toast.classList.add('removing');
      setTimeout(() => {
        if (toastContainer && toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 300);
      clearTimeout(timeout);
    };

    closeBtn.addEventListener('click', dismiss);
    timeout = setTimeout(dismiss, 5000);
  }

  // Browser Desktop Notifications
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function showBrowserNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try {
        const n = new Notification(title, {
          body: message,
          icon: '/housecare.jpg'
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch (e) {}
    }
  }

  // Toggle Dropdown Panel
  function togglePanel() {
    isPanelOpen = !isPanelOpen;
    if (isPanelOpen) {
      panelEl.classList.add('open');
      loadNotifications();
    } else {
      panelEl.classList.remove('open');
    }
  }

  function closePanel(e) {
    if (isPanelOpen && wrapperEl && !wrapperEl.contains(e.target)) {
      isPanelOpen = false;
      panelEl.classList.remove('open');
    }
  }

  function updateBadge() {
    if (!badgeEl) return;
    const markAllBtn = panelEl ? panelEl.querySelector('#hc-mark-all-read') : null;
    const titleEl = panelEl ? panelEl.querySelector('.hc-notif-header-title h3') : null;

    if (unreadCount > 0) {
      badgeEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badgeEl.classList.remove('hidden');
      bellBtn.classList.add('has-unread');
      if (markAllBtn) markAllBtn.style.display = 'inline-block';
      if (titleEl) titleEl.textContent = `Notifications (${unreadCount})`;
    } else {
      badgeEl.classList.add('hidden');
      bellBtn.classList.remove('has-unread');
      if (markAllBtn) markAllBtn.style.display = 'none';
      if (titleEl) titleEl.textContent = 'Notifications';
    }
  }

  async function refreshBadge() {
    try {
      if (!window.HouseCareAuth || !window.HouseCareAuth.getUserToken()) return;
      const res = await window.HouseCareAuth.fetchJson('/notifications/user/unread-count', { auth: 'user' });
      if (res && typeof res.count === 'number') {
        unreadCount = res.count;
        updateBadge();
      }
    } catch (e) {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await window.HouseCareAuth.fetchJson('/notifications/mark-all-read', { method: 'PUT', auth: 'user' });
      unreadCount = 0;
      updateBadge();
      if (listEl) {
        listEl.querySelectorAll('.hc-notif-item.unread').forEach(el => el.classList.remove('unread'));
      }
      showToast('info', 'Notifications Cleared', 'All notifications have been marked as read.');
    } catch (e) {
      console.error('Failed to mark all read', e);
    }
  }

  async function markAsRead(id, itemEl) {
    try {
      await window.HouseCareAuth.fetchJson(`/notifications/${id}/read`, { method: 'PUT', auth: 'user' });
      if (itemEl.classList.contains('unread')) {
        itemEl.classList.remove('unread');
        unreadCount = Math.max(0, unreadCount - 1);
        updateBadge();
      }
    } catch (e) {
      console.error('Failed to mark notification read', e);
    }
  }

  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  }

  function getIconForType(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('booking')) {
      return {
        class: 'booking',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
      };
    }
    if (t.includes('tracking') || t.includes('location')) {
      return {
        class: 'tracking',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
      };
    }
    if (t.includes('payment')) {
      return {
        class: 'payment',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'
      };
    }
    if (t.includes('alert') || t.includes('warning')) {
      return {
        class: 'alert',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
      };
    }
    return {
      class: 'general',
      svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
    };
  }

  async function loadNotifications() {
    if (!listEl) return;

    listEl.innerHTML = `
      <div class="hc-notif-loading">
        <div class="hc-notif-spinner"></div>
        <span>Loading updates...</span>
      </div>
    `;

    try {
      const res = await window.HouseCareAuth.fetchJson('/notifications/user', { auth: 'user' });
      const notifications = Array.isArray(res) ? res : [];

      if (notifications.length === 0) {
        listEl.innerHTML = `
          <div class="hc-notif-empty">
            <div class="hc-notif-empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <h4>All caught up!</h4>
            <p>You have no active notifications right now.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = '';
      notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = `hc-notif-item ${notif.isRead ? '' : 'unread'}`;

        const iconInfo = getIconForType(notif.type);

        item.innerHTML = `
          <div class="hc-notif-icon ${iconInfo.class}">
            ${iconInfo.svg}
          </div>
          <div class="hc-notif-content">
            <div class="hc-notif-head">
              <strong>${notif.title || 'Notification'}</strong>
              <time>${formatTimeAgo(notif.createdAt)}</time>
            </div>
            <p title="${notif.message}">${notif.message}</p>
          </div>
        `;

        item.addEventListener('click', () => {
          if (!notif.isRead) {
            markAsRead(notif._id || notif.id, item);
            notif.isRead = true;
          }
        });

        listEl.appendChild(item);
      });
    } catch (e) {
      listEl.innerHTML = `
        <div class="hc-notif-empty error">
          <p>Failed to load notifications.</p>
        </div>
      `;
    }
  }

  // Socket Setup
  function initSocket() {
    if (!window.HouseCareAuth) return;
    const token = window.HouseCareAuth.getUserToken();
    const user = window.HouseCareAuth.getUser();

    if (!token || !user || !window.io) return;

    try {
      socket = window.io(window.HouseCareAuth.SOCKET_BASE, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        socket.emit('user-join', user._id || user.id);
      });

      socket.on('notification', (data) => {
        showToast('info', data.title || 'New Notification', data.message || '');
        refreshBadge();
        if (isPanelOpen) loadNotifications();
      });

      socket.on('broadcast-notification', (data) => {
        showToast('info', data.title || 'Announcement', data.message || '');
      });

      socket.on('booking-updated', (data) => {
        showToast('success', 'Booking Update', data.message || 'Your booking status has changed.');
        refreshBadge();
        if (isPanelOpen) loadNotifications();
      });

      socket.on('tracking:update', (data) => {
        showToast('info', 'Live Tracking', data.message || 'Service provider location updated.');
        refreshBadge();
        if (isPanelOpen) loadNotifications();
      });

      socket.on('notification:new', (data) => {
        showToast('info', data.title || 'New Notification', data.message || '');
        unreadCount++;
        updateBadge();
        if (isPanelOpen) loadNotifications();
      });
    } catch (e) {
      console.warn('Socket connection initialization skipped', e);
    }
  }

  // Inject UI Components
  function injectUI() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    // Remove any previous instances
    const oldWrapper = document.querySelector('.hc-notif-wrapper');
    if (oldWrapper) oldWrapper.remove();

    // Create wrapper container
    wrapperEl = document.createElement('div');
    wrapperEl.className = 'hc-notif-wrapper';

    // Create Bell Button
    bellBtn = document.createElement('button');
    bellBtn.className = 'hc-notif-bell';
    bellBtn.title = 'Live Notifications';
    bellBtn.setAttribute('aria-label', 'Live Notifications');
    bellBtn.setAttribute('type', 'button');
    bellBtn.innerHTML = `
      <svg class="hc-bell-svg" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    `;

    // Unread count badge
    badgeEl = document.createElement('span');
    badgeEl.className = 'hc-notif-badge hidden';
    badgeEl.textContent = '0';
    bellBtn.appendChild(badgeEl);

    // Create Dropdown Panel
    panelEl = document.createElement('div');
    panelEl.className = 'hc-notif-panel';

    panelEl.innerHTML = `
      <div class="hc-notif-panel-header">
        <div class="hc-notif-header-title">
          <h3>Notifications</h3>
          <span class="hc-notif-pill-live">Live</span>
        </div>
        <div class="hc-notif-header-actions">
          <button class="hc-sound-toggle" title="Toggle Sound Notification" type="button" aria-label="Toggle Sound">
            <span class="hc-sound-icon">${soundEnabled ? '🔔' : '🔕'}</span>
          </button>
          <button id="hc-mark-all-read" class="hc-mark-read-btn" type="button">Mark all read</button>
        </div>
      </div>
      <div class="hc-notif-list"></div>
      <div class="hc-notif-footer">
        <a href="tracking.html" class="hc-notif-footer-link">View Live Tracking &rarr;</a>
      </div>
    `;

    listEl = panelEl.querySelector('.hc-notif-list');
    const markAllBtn = panelEl.querySelector('#hc-mark-all-read');
    const soundToggleBtn = panelEl.querySelector('.hc-sound-toggle');
    const soundIcon = panelEl.querySelector('.hc-sound-icon');

    markAllBtn.addEventListener('click', markAllRead);
    soundToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.HouseCareNotifications.toggleSound();
      soundIcon.textContent = soundEnabled ? '🔔' : '🔕';
      soundToggleBtn.title = soundEnabled ? 'Sound Enabled' : 'Sound Muted';
    });

    const isLoggedIn = !!(window.HouseCareAuth && window.HouseCareAuth.getUserToken());

    if (isLoggedIn) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
      });
    } else {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showToast('info', 'Sign In to View Notifications', 'Log in to track your live service requests, electrician updates, and bookings.');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
      });
      bellBtn.title = 'Sign in to view live notifications';
    }

    document.addEventListener('click', closePanel);

    wrapperEl.appendChild(bellBtn);
    wrapperEl.appendChild(panelEl);

    // Place before themeToggle or at beginning of navActions
    const themeToggle = navActions.querySelector('#themeToggle') || navActions.querySelector('.theme-toggle');
    if (themeToggle) {
      navActions.insertBefore(wrapperEl, themeToggle);
    } else {
      navActions.prepend(wrapperEl);
    }
  }

  function init() {
    if (!window.HouseCareAuth) return;

    // Do not inject user bell inside dedicated admin viewports
    if (window.location.pathname.includes('admin-dashboard.html') || window.location.pathname.includes('analytics.html')) {
      return;
    }

    injectUI();

    const isLoggedIn = !!window.HouseCareAuth.getUserToken();
    if (isLoggedIn) {
      refreshBadge();
      initSocket();
      requestNotificationPermission();
    }
  }

  window.HouseCareNotifications = {
    showToast,
    refreshBadge,
    toggleSound: () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('housecare-notification-sound', soundEnabled);
      return soundEnabled;
    },
    isSoundEnabled: () => soundEnabled,
    test: (title, msg, type) => {
      showToast(type || 'info', title || 'Test Notification', msg || 'Your live housekeeping updates will appear right here.');
    },
    init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


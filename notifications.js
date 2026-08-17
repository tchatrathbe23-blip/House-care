/**
 * HouseCare Notification System
 */
(function() {
  'use strict';

  let socket = null;
  let unreadCount = 0;
  let isPanelOpen = false;
  let soundEnabled = localStorage.getItem('housecare-notification-sound') !== 'false';
  let audioContext = null;

  // DOM Elements
  let bellBtn = null;
  let badgeEl = null;
  let panelEl = null;
  let listEl = null;
  let toastContainer = null;
  
  // Audio chime generation
  function playChime() {
    if (!soundEnabled) return;
    
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const osc = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      
      osc.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      osc.start();
      osc.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.warn('Web Audio API not supported or blocked', e);
    }
  }

  // Toast UI
  function showToast(type, title, message) {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'hc-toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // limit to 3 toasts
    while (toastContainer.children.length >= 3) {
      const oldest = toastContainer.lastElementChild;
      if (oldest) {
        toastContainer.removeChild(oldest);
      }
    }
    
    const toast = document.createElement('div');
    toast.className = `hc-toast ${type}`;
    
 let icon = '🔔';
if (type === 'success') icon = '✅';
if (type === 'info') icon = 'ℹ️';
if (type === 'warning') icon = '⚠️';
if (type === 'error') icon = '❌';
    toast.innerHTML = `
      <div class="hc-toast-icon">${icon}</div>
      <div class="hc-toast-body">
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
      <button class="hc-toast-close">âœ•</button>
      <div class="hc-toast-progress"></div>
    `;

    toastContainer.prepend(toast);
    
    // Play sound and show browser notification if needed
    playChime();
    showBrowserNotification(title, message);

    const closeBtn = toast.querySelector('.hc-toast-close');
    let timeout;
    
    const dismiss = () => {
      toast.classList.add('removing');
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 300);
      clearTimeout(timeout);
    };

    closeBtn.addEventListener('click', dismiss);
    timeout = setTimeout(dismiss, 5000);
  }

  // Browser Notifications
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function showBrowserNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      const n = new Notification(title, {
        body: message,
        icon: '/favicon.ico' // Assuming a favicon exists
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  }

  // Dropdown UI
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
    if (isPanelOpen && !panelEl.contains(e.target) && !bellBtn.contains(e.target)) {
      isPanelOpen = false;
      panelEl.classList.remove('open');
    }
  }

  function updateBadge() {
    if (!badgeEl) return;
    if (unreadCount > 0) {
      badgeEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badgeEl.classList.remove('hidden');
    } else {
      badgeEl.classList.add('hidden');
    }
  }

  async function refreshBadge() {
    try {
      const res = await window.HouseCareAuth.fetchJson('/notifications/user/unread-count', { auth: 'user' });
      if (res && res.count !== undefined) {
        unreadCount = res.count;
        updateBadge();
      }
    } catch (e) {
      console.error('Failed to fetch unread count', e);
    }
  }

  async function markAllRead() {
    try {
      await window.HouseCareAuth.fetchJson('/notifications/mark-all-read', { method: 'PUT', auth: 'user' });
      unreadCount = 0;
      updateBadge();
      loadNotifications(); // Reload list
    } catch (e) {
      console.error('Failed to mark all read', e);
    }
  }

  async function markAsRead(id, itemEl) {
    try {
      await window.HouseCareAuth.fetchJson(`/notifications/${id}/read`, { method: 'PUT' });
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
    let iconClass = 'general';
   let iconChar = '🔔';

if (type.includes('booking')) iconChar = '📅';
else if (type.includes('tracking')) iconChar = '📍';
else if (type.includes('payment')) iconChar = '💳';
else if (type.includes('alert')) iconChar = '⚠️';
    
    return { class: iconClass, char: iconChar };
  }

  async function loadNotifications() {
    if (!listEl) return;
    
    listEl.innerHTML = '<div class="hc-notif-empty" style="padding:20px;text-align:center;">Loading...</div>';
    
    try {
      const res = await window.HouseCareAuth.fetchJson('/notifications/user', { auth: 'user' });
      const notifications = res || [];
      
      if (notifications.length === 0) {
        listEl.innerHTML = `
          <div class="hc-notif-empty">
            <span>ðŸ””</span>
            <p>No notifications yet</p>
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
          <div class="hc-notif-icon ${iconInfo.class}">${iconInfo.char}</div>
          <div class="hc-notif-content">
            <strong>${notif.title || 'Notification'}</strong>
            <p title="${notif.message}">${notif.message}</p>
            <time>${formatTimeAgo(notif.createdAt)}</time>
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
      listEl.innerHTML = '<div class="hc-notif-empty" style="color:#e85d75;">Failed to load notifications</div>';
    }
  }

  // Socket Setup
  function initSocket() {
    const token = window.HouseCareAuth.getUserToken();
    const user = window.HouseCareAuth.getUser();
    
    if (!token || !user || !window.io) return;
    
    socket = window.io(window.HouseCareAuth.SOCKET_BASE, {
      auth: { token }
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
      showToast('info', data.title || 'Broadcast', data.message || '');
    });
    
    socket.on('booking-updated', (data) => {
      showToast('success', 'Booking Updated', data.message || 'Your booking status has changed.');
      refreshBadge();
    });
    
    socket.on('tracking:update', (data) => {
      showToast('info', 'Tracking Update', data.message || 'Service tracking updated.');
    });
    
    socket.on('notification:new', (data) => {
      showToast('info', data.title || 'New Notification', data.message || '');
      unreadCount++;
      updateBadge();
      if (isPanelOpen) loadNotifications();
    });
  }

  // Inject UI
  function injectUI() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    // Create Bell Button
    bellBtn = document.createElement('button');
    bellBtn.className = 'hc-notif-bell';
  bellBtn.innerHTML = '<i class="fa-solid fa-bell"></i>';
    bellBtn.title = 'Notifications';
    
    badgeEl = document.createElement('div');
    badgeEl.className = 'hc-notif-badge hidden';
    bellBtn.appendChild(badgeEl);
    
    // Create Dropdown Panel
    panelEl = document.createElement('div');
    panelEl.className = 'hc-notif-panel';
    
    panelEl.innerHTML = `
      <div class="hc-notif-panel-header">
        <h3>Notifications</h3>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="hc-sound-toggle" title="Toggle Sound">
           ${soundEnabled ? '🔊' : '🔇'}
          </button>
          <button id="hc-mark-all-read">Mark all read</button>
        </div>
      </div>
      <div class="hc-notif-list"></div>
    `;
    
    listEl = panelEl.querySelector('.hc-notif-list');
    const markAllBtn = panelEl.querySelector('#hc-mark-all-read');
    const soundToggleBtn = panelEl.querySelector('.hc-sound-toggle');
    
    markAllBtn.addEventListener('click', markAllRead);
    soundToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.HouseCareNotifications.toggleSound();
      soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
    });
    
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });
    
    document.addEventListener('click', closePanel);
    
    // Insert into nav
    const firstBtn = navActions.querySelector('.btn') || navActions.firstChild;
    if (firstBtn) {
      navActions.insertBefore(bellBtn, firstBtn);
      navActions.insertBefore(panelEl, firstBtn);
    } else {
      navActions.appendChild(bellBtn);
      navActions.appendChild(panelEl);
    }
  }

  function init() {
    if (!window.HouseCareAuth) {
      console.warn('HouseCareNotifications requires HouseCareAuth to be loaded first.');
      return;
    }
    
    if (window.HouseCareAuth.getAdminToken()) {
      // Optional admin logic
      return;
    }
    
    if (window.HouseCareAuth.getUserToken()) {
      injectUI();
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
    init
  };

  document.addEventListener('DOMContentLoaded', init);

})();


const adminState = {
  bookings: [],
  trackings: [],
  notifications: [],
  socket: null,
  soundEnabled: localStorage.getItem('housecare-admin-notification-sound') !== 'false',
  audioContext: null,
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function prettyStatus(status) {
  return (status || "pending").replace(/_/g, " ");
}

function statusClass(status) {
  return `admin-status status-${String(status || "pending").toLowerCase().replace(/\s+/g, "-")}`;
}

function playAdminChime() {
  if (!adminState.soundEnabled) return;

  try {
    if (!adminState.audioContext) {
      adminState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (adminState.audioContext.state === "suspended") {
      adminState.audioContext.resume();
    }

    const oscillator = adminState.audioContext.createOscillator();
    const gain = adminState.audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(587.33, adminState.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(783.99, adminState.audioContext.currentTime + 0.12);
    gain.gain.setValueAtTime(0, adminState.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.22, adminState.audioContext.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, adminState.audioContext.currentTime + 0.5);
    oscillator.connect(gain);
    gain.connect(adminState.audioContext.destination);
    oscillator.start();
    oscillator.stop(adminState.audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn("Admin notification sound unavailable", error);
  }
}

function updateSoundToggle() {
  const button = document.getElementById("adminSoundToggle");
  if (button) button.textContent = adminState.soundEnabled ? "Sound on" : "Sound off";
}

function pushNotification(title, message) {
  adminState.notifications.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    message,
    timestamp: new Date(),
  });
  adminState.notifications = adminState.notifications.slice(0, 10);
  renderNotifications();
  playAdminChime();
}

function renderNotifications() {
  const panel = document.getElementById("notificationsList");
  if (!panel) return;

  if (!adminState.notifications.length) {
    panel.innerHTML = '<div class="admin-list-empty">Live alerts, tracking updates, and booking changes will appear here.</div>';
    return;
  }

  panel.innerHTML = adminState.notifications
    .map((item) => {
      return `
        <article class="admin-notification-row">
          <div class="admin-row-main">
            <strong>${item.title}</strong>
            <span>${new Date(item.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div class="admin-row-meta">
            <span>${item.message}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderStats() {
  const totalBookings = adminState.bookings.length;
  const liveServices = adminState.trackings.filter((tracking) => !["completed", "cancelled"].includes(tracking.status)).length;
  const totalRevenue = adminState.bookings
    .filter((booking) => booking.paymentStatus === "Paid")
    .reduce((sum, booking) => sum + (booking.price || 0), 0);
  const completedRate = totalBookings
    ? Math.round((adminState.bookings.filter((booking) => booking.status === "Completed").length / totalBookings) * 100)
    : 0;

  document.getElementById("statTotalBookings").textContent = String(totalBookings);
  document.getElementById("statLiveTracking").textContent = String(liveServices);
  document.getElementById("statRevenue").textContent = formatCurrency(totalRevenue);
  document.getElementById("statCompletionRate").textContent = `${completedRate}%`;
}

function renderBookings() {
  const container = document.getElementById("bookingsList");
  if (!container) return;

  if (!adminState.bookings.length) {
    container.innerHTML = '<div class="admin-list-empty">No bookings are available yet.</div>';
    return;
  }

  container.innerHTML = adminState.bookings
    .slice(0, 8)
    .map((booking) => {
      return `
        <article class="admin-booking-row">
          <div class="admin-row-main">
            <div>
              <strong>${booking.name || "Customer unavailable"}</strong>
              <span>${booking.bookingId || booking._id || "No reference"}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <select class="${statusClass(booking.status)}" onchange="updateBookingStatus('${booking._id}', this.value)" style="border: none; cursor: pointer; font-family: inherit; font-weight: 600;">
                <option value="Pending" ${booking.status === "Pending" ? "selected" : ""}>Pending</option>
                <option value="In Progress" ${booking.status === "In Progress" ? "selected" : ""}>In Progress</option>
                <option value="Completed" ${booking.status === "Completed" ? "selected" : ""}>Completed</option>
              </select>
              <button class="admin-delete-btn" onclick="deleteBooking('${booking._id}')" title="Delete Booking">ðŸ—‘ï¸</button>
            </div>
          </div>
          <div class="admin-row-meta">
            <span>${booking.service || "Service not set"}</span>
            <span>${booking.date || "Date pending"} ${booking.time ? `at ${booking.time}` : ""}</span>
            <span class="editable-price" onclick="updatePrice('${booking._id}', ${booking.price})" title="Click to edit price">${formatCurrency(booking.price || 0)} âœï¸</span>
          </div>
          ${booking.tasks && booking.tasks.length ? `
            <div class="admin-task-list" style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--admin-border);">
              ${booking.tasks.map((task, idx) => `
                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; margin-bottom: 4px; cursor: pointer; opacity: ${task.completed ? 0.6 : 1}">
                  <input type="checkbox" ${task.completed ? "checked" : ""} onchange="toggleTaskStatus('${booking._id}', ${idx}, this.checked)">
                  <span style="${task.completed ? "text-decoration: line-through" : ""}">${task.title}</span>
                </label>
              `).join("")}
            </div>
          ` : ""}
        </article>
      `;
    })
    .join("");
}

async function toggleTaskStatus(bookingId, taskIndex, completed) {
  try {
    await HouseCareAuth.fetchJson(`/bookings/${bookingId}/tasks/${taskIndex}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
      auth: "admin",
    });
    pushNotification("Task Updated", `Task status synchronized with database.`);
    loadDashboardData();
  } catch (error) {
    alert(error.message);
    loadDashboardData();
  }
}

async function updatePrice(id, currentPrice) {
  const newPrice = prompt("Enter new price (INR):", currentPrice);
  if (newPrice === null || isNaN(newPrice)) return;

  try {
    await HouseCareAuth.fetchJson(`/bookings/${id}/price`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: Number(newPrice) }),
      auth: "admin",
    });
    pushNotification("Price Updated", `Price changed to â‚¹${newPrice}.`);
    loadDashboardData();
  } catch (error) {
    alert(error.message);
  }
}

async function bulkStatusUpdate() {
  const from = prompt("Enter source status (Pending, In Progress, Completed):");
  if (!from) return;
  const to = prompt(`Change all '${from}' bookings to:`);
  if (!to) return;

  try {
    const res = await HouseCareAuth.fetchJson("/bookings/bulk-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromStatus: from, toStatus: to }),
      auth: "admin",
    });
    pushNotification("Bulk Update Done", res.message);
    loadDashboardData();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteBooking(id) {
  if (!confirm("Are you sure you want to delete this booking? This action cannot be undone.")) return;

  try {
    await HouseCareAuth.fetchJson(`/bookings/${id}`, {
      method: "DELETE",
      auth: "admin",
    });
    pushNotification("Booking deleted", `Record ${id} has been permanently removed.`);
    loadDashboardData();
  } catch (error) {
    alert(`Failed to delete booking: ${error.message}`);
  }
}

async function updateBookingStatus(id, newStatus) {
  try {
    await HouseCareAuth.fetchJson(`/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
      auth: "admin",
    });
    pushNotification("Status Updated", `Booking ${id} is now ${newStatus}.`);
    loadDashboardData();
  } catch (error) {
    alert(`Failed to update status: ${error.message}`);
    loadDashboardData(); // Refresh to reset dropdown
  }
}

function renderTrackings() {
  const container = document.getElementById("trackingList");
  if (!container) return;

  if (!adminState.trackings.length) {
    container.innerHTML = '<div class="admin-list-empty">No active tracking sessions right now.</div>';
    return;
  }

  container.innerHTML = adminState.trackings
    .slice(0, 6)
    .map((tracking) => {
      const latestLocation = tracking.locations && tracking.locations.length
        ? tracking.locations[tracking.locations.length - 1]
        : null;

      const bookingRef = tracking.bookingId && typeof tracking.bookingId === "object"
        ? tracking.bookingId.bookingId || tracking.bookingId._id
        : tracking.bookingId;

      return `
        <article class="admin-tracking-row">
          <div class="admin-row-main">
            <div>
              <strong>${bookingRef || tracking._id}</strong>
              <span>${tracking.providerId?.name || "Provider assignment pending"}</span>
            </div>
            <span class="${statusClass(tracking.status)}">${prettyStatus(tracking.status)}</span>
          </div>
          <div class="admin-row-meta">
            <span>${latestLocation?.address || "Awaiting first location update"}</span>
            <span>${latestLocation?.timestamp ? formatDateTime(latestLocation.timestamp) : "No live ping yet"}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadDashboardData() {
  const bookingsList = document.getElementById("bookingsList");
  const trackingList = document.getElementById("trackingList");

  bookingsList.innerHTML = '<div class="admin-loading">Loading bookings...</div>';
  trackingList.innerHTML = '<div class="admin-loading">Loading live tracking...</div>';

  try {
    const [bookings, trackings] = await Promise.all([
      HouseCareAuth.fetchJson("/bookings?limit=100", { auth: "admin" }),
      HouseCareAuth.fetchJson("/tracking", { auth: "admin" }),
    ]);

    adminState.bookings = Array.isArray(bookings) ? bookings : [];
    adminState.trackings = Array.isArray(trackings) ? trackings : [];
    renderStats();
    renderBookings();
    renderTrackings();
  } catch (error) {
    bookingsList.innerHTML = `<div class="admin-error">${error.message}</div>`;
    trackingList.innerHTML = `<div class="admin-error">${error.message}</div>`;

    if (error.status === 401 || error.status === 403) {
      HouseCareAuth.logoutAdmin("admin-login.html");
    }
  }
}

function setupSidebar() {
  const root = document.body;
  const collapseKey = "housecare-admin-sidebar-collapsed";
  const sidebarToggle = document.getElementById("sidebarToggle");
  const mobileToggle = document.getElementById("mobileSidebarToggle");

  const savedState = localStorage.getItem(collapseKey);
  root.dataset.sidebarCollapsed = savedState === "true" ? "true" : "false";

  function toggleDesktopSidebar() {
    const next = root.dataset.sidebarCollapsed !== "true";
    root.dataset.sidebarCollapsed = next ? "true" : "false";
    localStorage.setItem(collapseKey, root.dataset.sidebarCollapsed);
  }

  sidebarToggle.addEventListener("click", toggleDesktopSidebar);
  mobileToggle.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  document.querySelectorAll(".admin-nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("sidebar-open");
    });
  });
}

function initSocket() {
  adminState.socket = io(HouseCareAuth.SOCKET_BASE);

  const admin = HouseCareAuth.getAdmin();
  adminState.socket.emit("admin-join", admin?.id || admin?.username || "admin");

  adminState.socket.on("tracking:update", (payload) => {
    pushNotification(
      "Tracking update",
      `${payload.bookingId || payload.trackingId} is now ${prettyStatus(payload.status)}${payload.address ? ` near ${payload.address}` : ""}.`
    );
    loadDashboardData();
  });

  adminState.socket.on("booking-updated", (payload) => {
    pushNotification(
      "Booking status changed",
      `${payload.bookingId || "Booking"} moved to ${prettyStatus(payload.status)}.`
    );
    loadDashboardData();
  });

  adminState.socket.on("broadcast-notification", (payload) => {
    pushNotification(payload.title || "Platform update", payload.message || "A new update is available.");
  });
}

function bindActions() {
  const soundToggle = document.getElementById("adminSoundToggle");
  if (soundToggle) {
    updateSoundToggle();
    soundToggle.addEventListener("click", () => {
      adminState.soundEnabled = !adminState.soundEnabled;
      localStorage.setItem("housecare-admin-notification-sound", String(adminState.soundEnabled));
      updateSoundToggle();
    });
  }

  document.getElementById("logoutButton").addEventListener("click", () => {
    if (adminState.socket) adminState.socket.disconnect();
    HouseCareAuth.logoutAdmin("admin-login.html");
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const admin = HouseCareAuth.requireAdmin({ returnTo: "admin-dashboard.html" });
  if (!admin) return;

  document.getElementById("adminIdentity").textContent = admin.username || admin.email || "Administrator";
  document.getElementById("adminMeta").textContent = admin.role ? admin.role.replace(/_/g, " ") : "admin access";

  setupSidebar();
  bindActions();
  renderNotifications();
  initSocket();
  loadDashboardData();
  window.setInterval(loadDashboardData, 30000);
});




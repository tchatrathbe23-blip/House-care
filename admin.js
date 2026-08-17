let bookings = [];

const table = document.getElementById("bookingTable");
const searchInput = document.getElementById("searchBookings");

function api() {
  if (!window.HouseCareAuth || !window.HouseCareAuth.fetchJson) {
    throw new Error("HouseCareAuth is required for admin API access");
  }
  return window.HouseCareAuth;
}

async function adminFetch(path, options = {}) {
  return api().fetchJson(path, { ...options, auth: "admin" });
}

/* =========================================================
   LOAD BOOKINGS FROM DATABASE
========================================================= */
async function loadBookings(page = 1) {
  try {
    bookings = await adminFetch(`/bookings?page=${page}&limit=20`);
  } catch (err) {
    console.error("Error loading bookings:", err);
    bookings = [];
  }
  renderTable(bookings);
  updateStats();
}

/* =========================================================
   RENDER TABLE
========================================================= */
function renderTable(list) {
  if (!table) return;
  table.innerHTML = "";

  list.forEach((b) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${b.bookingId || "-"}</td>
      <td>${b.name || "-"}</td>
      <td>${b.phone || "-"}</td>
      <td>${b.service || "-"}</td>
      <td>${b.date || "-"}</td>
      <td>${b.time || "-"}</td>
      <td>${b.address || "-"}</td>
      <td>
        <select class="status-select" data-id="${b._id}">
          <option value="Pending" ${b.status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="In Progress" ${b.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option value="Completed" ${b.status === "Completed" ? "selected" : ""}>Completed</option>
        </select>
      </td>
      <td style="color:${b.paymentStatus === "Paid" ? "green" : "red"}">${b.paymentStatus || "Not Paid"}</td>
      <td><button type="button" onclick="showInvoice('${b._id}')" title="Invoice">Invoice</button></td>
      <td><button type="button" class="delete-btn" data-id="${b._id}" title="Delete">Delete</button></td>
    `;

    table.appendChild(row);
  });

  addRowEvents();
}

/* =========================================================
   UPDATE STATUS
========================================================= */
function addRowEvents() {
  document.querySelectorAll(".status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const id = sel.dataset.id;
      try {
        await adminFetch(`/bookings/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: sel.value }),
        });
      } catch (e) {
        console.error("Failed to update status:", e);
      }
      loadBookings();
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!id || !confirm("Delete this booking?")) return;
      try {
        await adminFetch(`/bookings/${id}`, { method: "DELETE" });
        loadBookings();
      } catch (err) {
        console.error("Failed deleting booking:", err);
      }
    });
  });
}

/* =========================================================
   SEARCH
========================================================= */
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const text = searchInput.value.toLowerCase();

    const filtered = bookings.filter((b) =>
      (b.name && b.name.toLowerCase().includes(text)) ||
      (b.phone && b.phone.includes(text)) ||
      (b.service && b.service.toLowerCase().includes(text))
    );

    renderTable(filtered);
  });
}

/* =========================================================
   FILTER BUTTONS
========================================================= */
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const type = btn.dataset.filter;
    let path = "/bookings";
    if (type !== "all") {
      path += `?status=${type}`;
    }

    try {
      bookings = await adminFetch(path);
    } catch (e) {
      console.error("Failed to filter bookings:", e);
      bookings = [];
    }

    renderTable(bookings);
    updateStats();
  });
});

/* =========================================================
   STATS + REVENUE
========================================================= */
function updateStats() {
  const totalEl = document.getElementById("totalBookings");
  if (totalEl) totalEl.textContent = bookings.length;

  const pending = bookings.filter(b => b.status === "Pending").length;
  const completed = bookings.filter(b => b.status === "Completed").length;

  const pendingEl = document.getElementById("pendingCount");
  const completedEl = document.getElementById("completedCount");
  if (pendingEl) pendingEl.textContent = pending;
  if (completedEl) completedEl.textContent = completed;

  const revenue = bookings
    .filter(b => b.paymentStatus === "Paid")
    .reduce((sum, b) => sum + (b.price || 0), 0);

  const statValues = document.querySelectorAll(".stat-value");
  if (statValues[3]) statValues[3].textContent = `Rs ${revenue}`;
}

/* =========================================================
   INVOICE MODAL
========================================================= */
function showInvoice(id) {
  const b = bookings.find(x => x._id === id);
  if (!b) return;

  const modal = document.getElementById("invoiceModal");
  const body = document.getElementById("invoiceBody");
  if (!modal || !body) return;

  body.innerHTML = `
    <p><strong>Name:</strong> ${b.name || "-"}</p>
    <p><strong>Service:</strong> ${b.service || "-"}</p>
    <p><strong>Date:</strong> ${b.date || "-"}</p>
    <p><strong>Status:</strong> ${b.status || "-"}</p>
    <p><strong>Payment:</strong> ${b.paymentStatus || "Not Paid"}</p>
    <p><strong>Amount:</strong> Rs ${b.price || 0}</p>
  `;

  modal.style.display = "flex";
}

const closeModalBtn = document.querySelector(".close-modal");
if (closeModalBtn) {
  closeModalBtn.onclick = () => {
    const modal = document.getElementById("invoiceModal");
    if (modal) modal.style.display = "none";
  };
}

/* =========================================================
   EXPORT CSV
========================================================= */
const exportCSVBtn = document.getElementById("exportCSV");
if (exportCSVBtn) {
  exportCSVBtn.onclick = () => {
    let csv = "Name,Phone,Service,Date,Status,Payment\n";

    bookings.forEach(b => {
      csv += `${b.name || ""},${b.phone || ""},${b.service || ""},${b.date || ""},${b.status || ""},${b.paymentStatus || ""}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
}

/* =========================================================
   CLEAR ALL BOOKINGS
========================================================= */
const clearAllBtn = document.getElementById("clearAll");
if (clearAllBtn) {
  clearAllBtn.onclick = async () => {
    if (!confirm("Delete ALL bookings?")) return;

    try {
      for (const b of bookings) {
        if (b._id) {
          await adminFetch(`/bookings/${b._id}`, { method: "DELETE" });
        }
      }
    } catch (err) {
      console.error("Failed clearing bookings:", err);
    }

    loadBookings();
  };
}

loadBookings();

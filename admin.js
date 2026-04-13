let bookings = [];

const table = document.getElementById("bookingTable");
const searchInput = document.getElementById("searchBookings");

/* =========================================================
   LOAD BOOKINGS FROM DATABASE
========================================================= */
async function loadBookings(page = 1) {
  const res = await fetch(`http://localhost:5000/api/bookings?page=${page}&limit=20`);
  bookings = await res.json();
  renderTable(bookings);
  updateStats();
}

/* =========================================================
   RENDER TABLE
========================================================= */
function renderTable(list) {
  table.innerHTML = "";

  list.forEach((b) => {
    const row = document.createElement("tr");

   row.innerHTML = `
  <td>${b.bookingId || "-"}</td>
  <td>${b.name}</td>
  <td>${b.phone}</td>
  <td>${b.service}</td>
  <td>${b.date}</td>
  <td>${b.time}</td>
  <td>${b.address}</td>

  <td>
    <select class="status-select" data-id="${b._id}">
      <option value="Pending" ${b.status === "Pending" ? "selected" : ""}>Pending</option>
      <option value="In Progress" ${b.status === "In Progress" ? "selected" : ""}>In Progress</option>
      <option value="Completed" ${b.status === "Completed" ? "selected" : ""}>Completed</option>
    </select>
  </td>

  <td style="color:${b.paymentStatus === "Paid" ? "green" : "red"}">
    ${b.paymentStatus || "Not Paid"}
  </td>

  <td>
    <button onclick="showInvoice('${b._id}')">📄</button>
  </td>

      <td>
        <button class="delete-btn" data-id="${b._id}">❌</button>
      </td>
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

      await fetch(`http://localhost:5000/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: sel.value }),
      });

      loadBookings();
    });
  });
}

/* =========================================================
   DELETE BOOKING
========================================================

/* =========================================================
   SEARCH
========================================================= */
searchInput.addEventListener("input", () => {
  const text = searchInput.value.toLowerCase();

  const filtered = bookings.filter((b) =>
    b.name.toLowerCase().includes(text) ||
    b.phone.includes(text) ||
    b.service.toLowerCase().includes(text)
  );

  renderTable(filtered);
});

/* =========================================================
   FILTER BUTTONS
========================================================= */
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", async () => {

    const type = btn.dataset.filter;

    let url = "http://localhost:5000/api/bookings";

    if (type !== "all") {
      url += `?status=${type}`;
    }

    const res = await fetch(url);
    bookings = await res.json();

    renderTable(bookings);
    updateStats();
  });
});

/* =========================================================
   STATS + REVENUE
========================================================= */
function updateStats() {
  document.getElementById("totalBookings").textContent = bookings.length;

  const pending = bookings.filter(b => b.status === "Pending").length;
  const completed = bookings.filter(b => b.status === "Completed").length;

  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("completedCount").textContent = completed;

  // 🔥 Revenue calculation (only paid)
  const revenue = bookings
    .filter(b => b.paymentStatus === "Paid")
    .reduce((sum, b) => sum + (b.price || 0), 0);

  document.querySelectorAll(".stat-value")[3].textContent = `₹${revenue}`;
}

/* =========================================================
   INVOICE MODAL
========================================================= */
function showInvoice(id) {
  const b = bookings.find(x => x._id === id);

  const modal = document.getElementById("invoiceModal");
  const body = document.getElementById("invoiceBody");

  body.innerHTML = `
    <p><strong>Name:</strong> ${b.name}</p>
    <p><strong>Service:</strong> ${b.service}</p>
    <p><strong>Date:</strong> ${b.date}</p>
    <p><strong>Status:</strong> ${b.status}</p>
    <p><strong>Payment:</strong> ${b.paymentStatus || "Not Paid"}</p>
    <p><strong>Amount:</strong> ₹${b.price}</p>
  `;

  modal.style.display = "flex";
}

document.querySelector(".close-modal").onclick = () => {
  document.getElementById("invoiceModal").style.display = "none";
};

/* =========================================================
   EXPORT CSV
========================================================= */
document.getElementById("exportCSV").onclick = () => {
  let csv = "Name,Phone,Service,Date,Status,Payment\n";

  bookings.forEach(b => {
    csv += `${b.name},${b.phone},${b.service},${b.date},${b.status},${b.paymentStatus}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "bookings.csv";
  a.click();
};

/* =========================================================
   CLEAR ALL BOOKINGS
========================================================= */
document.getElementById("clearAll").onclick = async () => {
  if (!confirm("Delete ALL bookings?")) return;

  for (let b of bookings) {
    await fetch(`http://localhost:5000/api/bookings/${b._id}`, {
      method: "DELETE"
    });
  }

  loadBookings();
};

/* =========================================================
   INITIAL LOAD
========================================================= */
loadBookings();
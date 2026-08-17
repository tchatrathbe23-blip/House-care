const analyticsState = {
  charts: {},
};

function analyticsFormatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function analyticsSetupSidebar() {
  const root = document.body;
  const collapseKey = "housecare-admin-sidebar-collapsed";
  const sidebarToggle = document.getElementById("sidebarToggle");
  const mobileToggle = document.getElementById("mobileSidebarToggle");

  root.dataset.sidebarCollapsed = localStorage.getItem(collapseKey) === "true" ? "true" : "false";

  sidebarToggle.addEventListener("click", () => {
    const next = root.dataset.sidebarCollapsed !== "true";
    root.dataset.sidebarCollapsed = next ? "true" : "false";
    localStorage.setItem(collapseKey, root.dataset.sidebarCollapsed);
  });

  mobileToggle.addEventListener("click", () => {
    root.classList.toggle("sidebar-open");
  });

  document.querySelectorAll(".admin-nav-link").forEach((link) => {
    link.addEventListener("click", () => root.classList.remove("sidebar-open"));
  });
}

function analyticsDestroyChart(id) {
  if (analyticsState.charts[id]) {
    analyticsState.charts[id].destroy();
  }
}

function analyticsRenderChart(id, config, emptyMessage) {
  const canvas = document.getElementById(id);
  const hasData = config.data.datasets.some((dataset) => Array.isArray(dataset.data) && dataset.data.some((value) => value > 0));

  analyticsDestroyChart(id);

  if (!hasData) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.font = '16px Poppins';
    ctx.fillStyle = '#66758c';
    ctx.textAlign = 'center';
    ctx.fillText(emptyMessage, canvas.width / 2, canvas.height / 2);
    ctx.restore();
    return;
  }

  analyticsState.charts[id] = new Chart(canvas, config);
}

async function loadAnalytics() {
  const statusNode = document.getElementById("analyticsStatus");

  try {
    const [bookings, trackings, services, statuses, revenue, categories, daily] = await Promise.all([
      HouseCareAuth.fetchJson("/bookings?limit=200", { auth: "admin" }),
      HouseCareAuth.fetchJson("/tracking", { auth: "admin" }),
      HouseCareAuth.fetchJson("/analytics/services", { auth: "admin" }),
      HouseCareAuth.fetchJson("/analytics/status", { auth: "admin" }),
      HouseCareAuth.fetchJson("/analytics/revenue", { auth: "admin" }),
      HouseCareAuth.fetchJson("/analytics/category", { auth: "admin" }),
      HouseCareAuth.fetchJson("/analytics/daily", { auth: "admin" }),
    ]);

    const totalBookings = Array.isArray(bookings) ? bookings.length : 0;
    const activeTracking = Array.isArray(trackings) ? trackings.length : 0;
    const completed = Array.isArray(bookings)
      ? bookings.filter((booking) => booking.status === "Completed").length
      : 0;
    const completionRate = totalBookings ? Math.round((completed / totalBookings) * 100) : 0;

    document.getElementById("analyticsTotalBookings").textContent = String(totalBookings);
    document.getElementById("analyticsRevenue").textContent = analyticsFormatCurrency(revenue.total || 0);
    document.getElementById("analyticsActiveTracking").textContent = String(activeTracking);
    document.getElementById("analyticsCompletionRate").textContent = `${completionRate}%`;
    statusNode.textContent = `Loaded ${totalBookings} bookings and ${activeTracking} live tracking records from the backend.`;

    analyticsRenderChart(
      "serviceChart",
      {
        type: "bar",
        data: {
          labels: services.map((item) => item._id || "Unknown"),
          datasets: [{
            label: "Bookings",
            data: services.map((item) => item.count || 0),
            backgroundColor: ["#0f8cff", "#4aa8ff", "#89d0ff", "#ffc76a", "#ff9b85"],
            borderRadius: 12,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      },
      "No service analytics yet"
    );

    analyticsRenderChart(
      "statusChart",
      {
        type: "doughnut",
        data: {
          labels: statuses.map((item) => item._id || "Unknown"),
          datasets: [{
            data: statuses.map((item) => item.count || 0),
            backgroundColor: ["#ffb84d", "#0f8cff", "#19a974", "#e85d75"],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          cutout: '62%',
          plugins: { legend: { position: 'bottom' } },
        },
      },
      "No booking status data yet"
    );

    analyticsRenderChart(
      "dailyChart",
      {
        type: "line",
        data: {
          labels: daily.map((item) => item._id),
          datasets: [{
            label: "Bookings per day",
            data: daily.map((item) => item.count || 0),
            fill: true,
            borderColor: "#0f8cff",
            backgroundColor: "rgba(15, 140, 255, 0.12)",
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#0f8cff",
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      },
      "No daily booking trend yet"
    );

    analyticsRenderChart(
      "categoryChart",
      {
        type: "bar",
        data: {
          labels: categories.map((item) => item._id || "Uncategorized"),
          datasets: [{
            label: "Revenue",
            data: categories.map((item) => item.revenue || 0),
            backgroundColor: "rgba(255, 184, 77, 0.75)",
            borderColor: "#ffb84d",
            borderWidth: 1,
            borderRadius: 12,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label(context) {
                  return analyticsFormatCurrency(context.parsed.y);
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback(value) {
                  return analyticsFormatCurrency(value);
                },
              },
            },
          },
        },
      },
      "No category revenue data yet"
    );
  } catch (error) {
    statusNode.textContent = `Analytics could not be loaded: ${error.message}`;
    if (error.status === 401 || error.status === 403) {
      HouseCareAuth.logoutAdmin("admin-login.html");
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const admin = HouseCareAuth.requireAdmin({ returnTo: "analytics.html" });
  if (!admin) return;

  document.getElementById("analyticsAdminIdentity").textContent = admin.username || admin.email || "Administrator";
  document.getElementById("analyticsAdminMeta").textContent = admin.role ? admin.role.replace(/_/g, " ") : "admin access";

  analyticsSetupSidebar();
  document.getElementById("analyticsLogoutButton").addEventListener("click", () => {
    HouseCareAuth.logoutAdmin("admin-login.html");
  });

  loadAnalytics();
});

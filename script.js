/* =========================================================
   SAFE DOM HELPER
========================================================= */
function get(id) {
  return document.getElementById(id);
}

/* =========================================================
   THEME TOGGLE — persists via localStorage
========================================================= */
(function () {
  const THEME_KEY = "housecare-theme";

  // Apply saved theme immediately (prevents flash)
  if (localStorage.getItem(THEME_KEY) === "dark") {
    document.body.classList.add("dark");
  }

  const themeToggle = get("themeToggle");
  if (themeToggle) {
    // Set correct icon on load
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";

    themeToggle.onclick = () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
      themeToggle.textContent = isDark ? "☀️" : "🌙";
    };
  }
})();

/* =========================================================
   BOOKING MODAL INITIALIZATION
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const modal = get("bookingModal");
  if (!modal) return;

  document.querySelectorAll("[data-open-booking]").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.style.display = "flex";
      const serviceCard = btn.closest(".service-card");
      const serviceInput = get("service");
      
      if (serviceCard) {
        // Clicked from service card - pre-fill the specific service
        const serviceName = serviceCard.querySelector("h3")?.innerText;
        if (serviceName && serviceInput) {
          serviceInput.value = serviceName;
        }
      } else {
        // Clicked from navbar or hero - clear service for all services
        if (serviceInput) {
          serviceInput.value = "";
        }
      }
    });
  });

  const closeBtn = document.querySelector(".close");
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
      if (window.resetFormArrays) window.resetFormArrays();
    };
  }

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
      if (window.resetFormArrays) window.resetFormArrays();
    }
  });
  // --- Helper to get array data from form ---
  function getRequirementsArray() {
    const val = get("specialRequirements")?.value || "";
    return val.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  }

  function getTasksArray() {
    const titles = document.querySelectorAll(".task-title-input");
    const priorities = document.querySelectorAll(".task-priority-input");
    const arr = [];
    titles.forEach((input, i) => {
      const title = input.value.trim();
      if (title) {
        arr.push({
          title,
          completed: false,
          priority: parseInt(priorities[i].value) || 1
        });
      }
    });
    return arr;
  }

  window.getSpecialRequirements = getRequirementsArray;
  window.getTasks = getTasksArray;

  window.resetFormArrays = () => {
    const reqField = get("specialRequirements");
    if (reqField) reqField.value = "";
    document.querySelectorAll(".task-title-input").forEach(i => i.value = "");
    document.querySelectorAll(".task-priority-input").forEach(i => i.value = "1");
  };
});

function storeLatestBooking(booking) {
  if (!booking) return;
  localStorage.setItem("lastBooking", JSON.stringify(booking));
}

/* =========================================================
   CONFIRM BOOKING (NO PAYMENT)
========================================================= */
async function confirmBooking() {
  const name = get("name")?.value;
  const phone = get("phone")?.value;
  const service = get("service")?.value;
  const date = get("date")?.value;
  const time = get("time")?.value;
  const address = get("address")?.value;
  const token = localStorage.getItem("token") || (window.HouseCareAuth && window.HouseCareAuth.getUserToken());

  if (!token) {
    alert("Please login first.");
    return;
  }
  if (!name || !phone || !service || !date || !time || !address) {
    alert("Please fill all fields");
    return;
  }

  if (phone.length !== 10 || isNaN(phone)) {
    alert("Invalid phone number");
    return;
  }

  try {
    const apiBase = (window.HouseCareAuth && window.HouseCareAuth.API_BASE) || "/api";
    const response = await fetch(`${apiBase}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        phone,
        service,
        category: service,
        date,
        time,
        address,
        specialRequirements: window.getSpecialRequirements ? window.getSpecialRequirements() : [],
        tasks: window.getTasks ? window.getTasks() : [],
        price: 500,
        status: "Pending",
        paymentStatus: "Not Paid",
      }),
    });

    const booking = await response.json();
    if (!response.ok) {
      alert(booking.error || booking.message || "Server error");
      return;
    }
    storeLatestBooking(booking);
    if (window.resetFormArrays) window.resetFormArrays();
    alert("Booking saved successfully!");
    const modal = get("bookingModal");
    if (modal) modal.style.display = "none";
  } catch (error) {
    console.error("Booking Error:", error);
    alert("Server error: " + error.message);
  }
}

/* =========================================================
   PAYMENT (RAZORPAY)
========================================================= */
async function payNow() {
  const name = get("name")?.value;
  const phone = get("phone")?.value;
  const service = get("service")?.value;
  const date = get("date")?.value;
  const time = get("time")?.value;
  const address = get("address")?.value;
  const token = localStorage.getItem("token") || (window.HouseCareAuth && window.HouseCareAuth.getUserToken());

  if (!token) {
    alert("Please login first.");
    return;
  }

  if (!name || !phone || !service || !date || !time || !address) {
    alert("Fill all fields first");
    return;
  }

  try {
    const apiBase = (window.HouseCareAuth && window.HouseCareAuth.API_BASE) || "/api";
    const res = await fetch(`${apiBase}/payment/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: 500
      })
    });

    const order = await res.json();

    if (typeof Razorpay === "undefined") {
      alert("Razorpay not loaded");
      return;
    }

    const options = {
      key: "rzp_test_TIZpZaZpnNlXP2",
      amount: order.amount,
      currency: "INR",
      name: "HouseCare",
      description: service,
      handler: async function () {
        try {
          console.log("Before booking fetch");
          const bookingResponse = await fetch(`${apiBase}/bookings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name,
              phone,
              service,
              category: service,
              date,
              time,
              address,
              specialRequirements: window.getSpecialRequirements ? window.getSpecialRequirements() : [],
              tasks: window.getTasks ? window.getTasks() : [],
              price: order.amount / 100,
              status: "Pending",
              paymentStatus: "Paid",
            }),
          });
          console.log("After booking fetch");
          console.log(bookingResponse.status);
          const booking = await bookingResponse.json();

          if (!bookingResponse.ok) {
            console.error("Backend Error:", booking);
            alert(booking.error || booking.message || "Server error");
            return;
          }

          storeLatestBooking(booking);
          if (window.resetFormArrays) window.resetFormArrays();
          alert("Payment successful and booking saved!");
          const modal = get("bookingModal");
          if (modal) modal.style.display = "none";
        } catch (error) {
          alert("Booking failed after payment");
        }
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (error) {
    alert("Payment failed");
  }
}

/* =========================================================
   TRACK LAST BOOKING (SAFE)
========================================================= */
const lastBox = get("lastBooking");

if (lastBox) {
  const stored = localStorage.getItem("lastBooking");

  if (stored) {
    const booking = JSON.parse(stored);

    lastBox.innerHTML = `
      <p><strong>${booking.service}</strong></p>
      <p>${booking.date} at ${booking.time}</p>
      <p>Status: ${booking.status}</p>
    `;
  }
}

/* =========================================================
   TESTIMONIAL CAROUSEL
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const testiItems = document.querySelectorAll(".testi-item");
  const dots = document.querySelectorAll(".testi-dots .dot");
  const prevBtn = document.getElementById("testiPrev");
  const nextBtn = document.getElementById("testiNext");
  let currentIndex = 0;

  if (testiItems.length > 0 && prevBtn && nextBtn) {
    function showTestimonial(index) {
      testiItems.forEach((item, i) => {
        item.classList.toggle("active", i === index);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
      });
    }

    prevBtn.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + testiItems.length) % testiItems.length;
      showTestimonial(currentIndex);
    });

    nextBtn.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % testiItems.length;
      showTestimonial(currentIndex);
    });

    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        currentIndex = i;
        showTestimonial(currentIndex);
      });
    });
  }
});

/* =========================================================
   SERVICES FILTER & LIVE SEARCH (services.html)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const filterBtns = document.querySelectorAll(".filter-btn");
  const searchInput = document.getElementById("serviceSearch");
  const serviceCards = document.querySelectorAll(".service-grid .service-card");

  if (filterBtns.length === 0 && !searchInput) return;

  let activeCategory = "all";
  let searchQuery = "";

  function applyFilters() {
    let visibleCount = 0;

    serviceCards.forEach((card) => {
      const category = (card.getAttribute("data-category") || "").toLowerCase();
      const name = (card.getAttribute("data-name") || "").toLowerCase();
      const text = card.textContent.toLowerCase();

      const matchesCategory =
        activeCategory === "all" ||
        category === activeCategory ||
        (activeCategory === "pest" && (category === "pest" || category === "pest control"));

      const matchesSearch =
        !searchQuery ||
        name.includes(searchQuery) ||
        text.includes(searchQuery);

      if (matchesCategory && matchesSearch) {
        card.style.display = "";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    let noResultsMsg = document.getElementById("noServicesFound");
    const grid = document.getElementById("serviceList") || document.querySelector(".service-grid");

    if (visibleCount === 0) {
      if (!noResultsMsg && grid) {
        noResultsMsg = document.createElement("div");
        noResultsMsg.id = "noServicesFound";
        noResultsMsg.style.cssText = "grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--muted); font-size: 1.05rem;";
        noResultsMsg.innerHTML = "🔍 No services found matching your criteria.";
        grid.appendChild(noResultsMsg);
      } else if (noResultsMsg) {
        noResultsMsg.style.display = "block";
      }
    } else if (noResultsMsg) {
      noResultsMsg.style.display = "none";
    }
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = (btn.getAttribute("data-filter") || "all").toLowerCase();
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }
});


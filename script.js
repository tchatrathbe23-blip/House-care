/* =========================================================
   SAFE DOM HELPER
========================================================= */
function get(id) {
  return document.getElementById(id);
}

/* =========================================================
   THEME TOGGLE (SAFE)
========================================================= */
const themeToggle = get("themeToggle");
if (themeToggle) {
  themeToggle.onclick = () => {
    document.body.classList.toggle("dark");
  };
}

/* =========================================================
   BOOKING MODAL INITIALIZATION
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const modal = get("bookingModal");
  if (!modal) return;

  // 1. Open Modal for ALL buttons with [data-open-booking]
  document.querySelectorAll("[data-open-booking]").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.style.display = "flex";

      // Auto-fill service from card if possible
      const serviceName = btn.closest(".service-card")?.querySelector("h3")?.innerText;
      const serviceInput = get("service");
      if (serviceName && serviceInput) {
        serviceInput.value = serviceName;
      }
    });
  });

  // 2. Close Modal (X button)
  const closeBtn = document.querySelector(".close");
  if (closeBtn) {
    closeBtn.onclick = () => (modal.style.display = "none");
  }

  // 3. Close Modal (Outside click)
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});

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

  // 🔥 Validation
  if (!name || !phone || !service || !date || !time || !address) {
    alert("Please fill all fields");
    return;
  }

  if (phone.length !== 10 || isNaN(phone)) {
    alert("Invalid phone number");
    return;
  }

  try {
    await fetch("http://localhost:5000/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone,
        service,
        category: service,
        date,
        time,
        address,
        price: 500,
        status: "Pending",
        paymentStatus: "Not Paid",
      }),
    });

    alert("✅ Booking saved successfully!");
  } catch (err) {
    alert("❌ Server error");
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

  if (!name || !phone || !service || !date || !time || !address) {
    alert("Fill all fields first");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/payment/create-order", {
      method: "POST",
    });

    const order = await res.json();

    // 🔥 Razorpay check
    if (typeof Razorpay === "undefined") {
      alert("Razorpay not loaded");
      return;
    }

    const options = {
      key: "rzp_test_ScuM7vSCSEDBxI",
      amount: order.amount,
      currency: "INR",
      name: "HouseCare",
      description: service,

      handler: async function (response) {
        try {
          await fetch("http://localhost:5000/api/bookings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name,
              phone,
              service,
              category: service,
              date,
              time,
              address,
              price: order.amount / 100,
              status: "Pending",
              paymentStatus: "Paid",
            }),
          });

          alert("✅ Payment successful & booking saved!");
        } catch (err) {
          alert("Booking failed after payment");
        }
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (err) {
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
    const b = JSON.parse(stored);

    lastBox.innerHTML = `
      <p><strong>${b.service}</strong></p>
      <p>${b.date} at ${b.time}</p>
      <p>Status: ${b.status}</p>
    `;
  }
}

// Logic handled in DOMContentLoaded initializer above
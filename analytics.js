window.onload = async () => {

  try {

    /* ==============================
       1. BOOKINGS PER SERVICE
    ============================== */
    const serviceData = await fetch("http://localhost:5000/api/analytics/services")
      .then(res => res.json());

    new Chart(document.getElementById("serviceChart"), {
      type: "bar",
      data: {
        labels: serviceData.map(d => d._id),
        datasets: [{
          label: "Bookings per Service",
          data: serviceData.map(d => d.count)
        }]
      }
    });


    /* ==============================
       2. STATUS DISTRIBUTION
    ============================== */
    const statusData = await fetch("http://localhost:5000/api/analytics/status")
      .then(res => res.json());

    new Chart(document.getElementById("statusChart"), {
      type: "pie",
      data: {
        labels: statusData.map(d => d._id),
        datasets: [{
          data: statusData.map(d => d.count)
        }]
      }
    });


    /* ==============================
       3. REVENUE DISPLAY
    ============================== */
    const revenueData = await fetch("http://localhost:5000/api/analytics/revenue")
      .then(res => res.json());

    const revenue = revenueData[0]?.total || 0;

    const revenueBox = document.createElement("h2");
    revenueBox.textContent = `Total Revenue: ₹${revenue}`;
    document.querySelector(".page").prepend(revenueBox);


    /* ==============================
       4. CATEGORY PERFORMANCE (BONUS)
    ============================== */
    const categoryData = await fetch("http://localhost:5000/api/analytics/category")
      .then(res => res.json());

    const canvas = document.createElement("canvas");
    document.querySelector(".page").appendChild(canvas);

    new Chart(canvas, {
      type: "bar",
      data: {
        labels: categoryData.map(d => d._id),
        datasets: [{
          label: "Revenue by Category",
          data: categoryData.map(d => d.revenue)
        }]
      }
    });

  } catch (err) {
    console.error("Analytics Error:", err);
  }

};
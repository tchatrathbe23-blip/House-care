document.addEventListener("DOMContentLoaded", () => {

  const calcBtn = document.getElementById("calcBtn");
  const calcResult = document.getElementById("calcResult");

  if (!calcBtn) {
    console.warn("Calculator not found on this page.");
    return;
  }

  calcBtn.addEventListener("click", () => {
    const service = document.getElementById("calcService").value;
    const hours = parseInt(document.getElementById("calcHours").value);
    const urgency = document.getElementById("calcUrgency").value;

    if (!service || hours < 1) {
      calcResult.textContent = "Please fill all fields correctly.";
      calcResult.style.display = "block";
      return;
    }

    const prices = {
      cleaning: 299,
      electrician: 199,
      plumber: 249,
      pest: 499
    };

    let price = prices[service] * hours;

    if (urgency === "urgent") price *= 1.3;

    calcResult.textContent = `Estimated Price: ₹${Math.round(price)}`;
    calcResult.style.display = "block";
  });

});

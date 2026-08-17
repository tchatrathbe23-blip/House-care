/* =========================================================
   HouseCare Professional Chatbot
   ========================================================= */
(function () {
  /* ---------- Knowledge Base ---------- */
  const KB = [
    { keys: ["hello", "hi", "hey", "good morning", "good evening"],
      reply: "Hello! 👋 Welcome to HouseCare. How can I assist you today?" },
    { keys: ["service", "what do you offer", "what services"],
      reply: "We offer **Home Cleaning**, **Electrician**, **Plumber**, and **Pest Control** services. Visit our <a href='services.html'>Services page</a> for full details!" },
    { keys: ["price", "cost", "rate", "how much", "charge", "fee", "expensive"],
      reply: "Our pricing starts at ₹249 for electrician visits, ₹299 for plumbing, ₹599 for kitchen cleaning, and ₹699 for full home cleaning. Use the <a href='services.html'>Price Calculator</a> for a custom estimate." },
    { keys: ["book", "schedule", "appointment", "reserve"],
      reply: "You can book a service by clicking the <strong>Book Now</strong> button in the top nav or on any service card. Fill in your details and we'll confirm your slot instantly! 🗓️" },
    { keys: ["track", "tracking", "status", "where is"],
      reply: "You can track your service professional in real-time on our <a href='tracking.html'>Live Tracking</a> page. Just enter your booking ID!" },
    { keys: ["cancel", "refund"],
      reply: "Cancellations are free up to 2 hours before the scheduled time. After that, a nominal fee may apply. For refunds, reach out to <strong>support@housecare.com</strong>." },
    { keys: ["payment", "pay", "upi", "card", "razorpay", "online"],
      reply: "We accept UPI, Credit/Debit cards, Net Banking and Razorpay. You can also choose <strong>Confirm (No Payment)</strong> to pay after the service." },
    { keys: ["contact", "phone", "email", "support", "help"],
      reply: "📧 <strong>support@housecare.com</strong><br>📞 <strong>+91 98765 43210</strong><br>Or visit our <a href='contact.html'>Contact page</a> to send a message." },
    { keys: ["hour", "timing", "time", "open", "available", "when"],
      reply: "We operate <strong>7 days a week, 8 AM – 9 PM</strong>. Emergency electrician and plumber services are available 24/7! ⚡" },
    { keys: ["area", "city", "location", "where", "deliver"],
      reply: "We currently serve <strong>Bengaluru, Delhi, Mumbai, Pune, Hyderabad</strong> and more cities are being added every month. 🏙️" },
    { keys: ["warranty", "guarantee"],
      reply: "Pest control comes with a <strong>3-month to 1-year warranty</strong> depending on the treatment. All work is backed by our quality guarantee." },
    { keys: ["clean", "cleaning", "deep clean", "kitchen", "bathroom"],
      reply: "Our cleaning services include Full Home Deep Cleaning (from ₹1799) and Kitchen Cleaning (from ₹599). We use eco-friendly chemicals and cover up to 4 BHK homes. 🧹" },
    { keys: ["electric", "fan", "light", "wiring", "switch", "socket"],
      reply: "Our certified electricians handle fan installation, light fixtures, switch/socket repair, and safe wiring. Starts at just ₹249. ⚡" },
    { keys: ["plumb", "leak", "pipe", "tap", "faucet", "bathroom fitting"],
      reply: "From leakage fixes to full bathroom fitting installations — our plumbers have you covered. Starts at ₹299. 🔧" },
    { keys: ["pest", "cockroach", "termite", "ant", "mosquito", "bug"],
      reply: "Odourless gel and spray treatments for cockroaches, ants, termites, and more. Includes <strong>warranty coverage</strong>. 🛡️" },
    { keys: ["safe", "trust", "verified", "background"],
      reply: "Every HouseCare professional is <strong>background-verified</strong>, trained, and rated by customers. Your safety is our top priority. ✅" },
    { keys: ["about", "who are you", "company"],
      reply: "HouseCare is your trusted home service partner — connecting you with verified professionals for cleaning, repairs, and pest control. <a href='about.html'>Learn more about us</a>." },
    { keys: ["thank", "thanks", "ok", "okay", "great", "perfect"],
      reply: "You're welcome! 😊 Is there anything else I can help you with?" },
  ];

  const FALLBACK = "I'm not sure about that, but I'd love to help! Try asking about our <strong>services</strong>, <strong>pricing</strong>, <strong>booking</strong>, or <strong>contact</strong> info. 💡";

  const QUICK_REPLIES = [
    { label: "🏠 Services", text: "What services do you offer?" },
    { label: "💰 Pricing", text: "What are your prices?" },
    { label: "📅 Book Now", text: "How do I book a service?" },
    { label: "📍 Track Order", text: "How can I track my order?" },
    { label: "📞 Contact", text: "How do I contact you?" },
  ];

  /* ---------- Bot Reply Logic ---------- */
  function getReply(input) {
    const lower = input.toLowerCase();
    for (const entry of KB) {
      if (entry.keys.some(k => lower.includes(k))) return entry.reply;
    }
    return FALLBACK;
  }

  /* ---------- Time Formatter ---------- */
  function timeNow() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  /* ---------- Build UI ---------- */
  // Floating button
  const fab = document.createElement("button");
  fab.className = "hc-chat-fab";
  fab.id = "hcChatFab";
  fab.setAttribute("aria-label", "Open chat assistant");
  fab.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  // Panel
  const panel = document.createElement("div");
  panel.className = "hc-chat-panel";
  panel.id = "hcChatPanel";
  panel.innerHTML = `
    <div class="hc-chat-header">
      <div class="hc-chat-header-info">
        <div class="hc-chat-avatar-sm">HC</div>
        <div>
          <div class="hc-chat-header-title">HouseCare Assistant</div>
          <div class="hc-chat-header-status"><span class="hc-status-dot"></span> Online</div>
        </div>
      </div>
      <button class="hc-chat-close" id="hcChatClose" aria-label="Close chat">&times;</button>
    </div>
    <div class="hc-chat-body" id="hcChatBody"></div>
    <div class="hc-chat-footer">
      <input type="text" id="hcChatInput" placeholder="Type a message..." autocomplete="off" />
      <button class="hc-chat-send" id="hcChatSend" aria-label="Send message">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  /* ---------- DOM Refs ---------- */
  const body = document.getElementById("hcChatBody");
  const input = document.getElementById("hcChatInput");
  const sendBtn = document.getElementById("hcChatSend");
  const closeBtn = document.getElementById("hcChatClose");

  /* ---------- Message Helpers ---------- */
  function addMessage(html, sender) {
    const wrap = document.createElement("div");
    wrap.className = `hc-msg hc-msg-${sender}`;

    const bubble = document.createElement("div");
    bubble.className = "hc-bubble";
    bubble.innerHTML = html;

    const time = document.createElement("span");
    time.className = "hc-msg-time";
    time.textContent = timeNow();

    wrap.appendChild(bubble);
    wrap.appendChild(time);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    const wrap = document.createElement("div");
    wrap.className = "hc-msg hc-msg-bot hc-typing-wrap";
    wrap.innerHTML = `<div class="hc-bubble hc-typing"><span></span><span></span><span></span></div>`;
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
    return wrap;
  }

  function addQuickReplies() {
    const existing = body.querySelector(".hc-quick-replies");
    if (existing) existing.remove();

    const row = document.createElement("div");
    row.className = "hc-quick-replies";
    QUICK_REPLIES.forEach(qr => {
      const chip = document.createElement("button");
      chip.className = "hc-chip";
      chip.textContent = qr.label;
      chip.addEventListener("click", () => {
        row.remove();
        handleSend(qr.text);
      });
      row.appendChild(chip);
    });
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  /* ---------- Send Handler ---------- */
  function handleSend(text) {
    const msg = (text || input.value).trim();
    if (!msg) return;
    input.value = "";

    addMessage(msg, "user");

    const typing = showTyping();
    const delay = 400 + Math.random() * 600;

    setTimeout(() => {
      typing.remove();
      addMessage(getReply(msg), "bot");
      addQuickReplies();
    }, delay);
  }

  /* ---------- Events ---------- */
  let isOpen = false;

  fab.addEventListener("click", () => {
    isOpen = !isOpen;
    panel.classList.toggle("hc-open", isOpen);
    fab.classList.toggle("hc-fab-active", isOpen);
    if (isOpen && body.children.length === 0) {
      // Welcome message
      setTimeout(() => {
        addMessage("👋 Hi there! I'm your <strong>HouseCare Assistant</strong>. Ask me anything about our services, pricing, bookings, or tracking!", "bot");
        addQuickReplies();
      }, 300);
    }
    if (isOpen) input.focus();
  });

  closeBtn.addEventListener("click", () => {
    isOpen = false;
    panel.classList.remove("hc-open");
    fab.classList.remove("hc-fab-active");
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") handleSend();
  });

  sendBtn.addEventListener("click", () => handleSend());
})();

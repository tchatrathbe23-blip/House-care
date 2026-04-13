const botBtn = document.createElement("button");
botBtn.className = "chatbot-btn";
botBtn.textContent = "💬";

const panel = document.createElement("div");
panel.className = "chatbot-panel";
panel.innerHTML = `
  <h3>HouseCare Assistant</h3>
  <div id="chatArea"></div>
  <input id="chatInput" placeholder="Ask something...">
`;

document.body.appendChild(botBtn);
document.body.appendChild(panel);

botBtn.onclick = () => {
  panel.classList.toggle("open");
};

const chatArea = document.getElementById("chatArea");
const chatInput = document.getElementById("chatInput");

chatInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const text = chatInput.value;
    chatArea.innerHTML += `<p class='user'>${text}</p>`;
    chatArea.innerHTML += `<p class='bot'>${botReply(text)}</p>`;
    chatInput.value = "";
  }
});

function botReply(text) {
  text = text.toLowerCase();

  if (text.includes("price")) return "Prices vary by service — check our Services page.";
  if (text.includes("book")) return "Click 'Book Now' anywhere on the site.";
  if (text.includes("contact")) return "You can reach us at +91 9876543210.";
  return "Sorry, I didn’t understand. Try asking: price, booking, contact.";
}

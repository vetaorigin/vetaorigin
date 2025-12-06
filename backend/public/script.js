// script.js (dashboard + chat + usage)
const API = "http://localhost:4000"; 

// DOM elements
const logoutBtn = document.getElementById("logoutBtn");
const usageText = document.getElementById("usageText");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");

// Universal fetch handler
async function fetchJson(url, opts = {}) {
  const options = {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts
  };

  const res = await fetch(url, options);
  let data = null;

  try {
    data = await res.json();
  } catch (e) {}

  return { res, data };
}

// Ensure the user is logged in
async function ensureAuth() {
  const { res, data } = await fetchJson(`${API}/auth/me`);
  if (!res.ok) {
    window.location.href = "./auth.html";
    return null;
  }
  return data.user;
}

// Page init
(async function init() {
  const user = await ensureAuth();
  if (!user) return;

  document.title = `${user.username} - VoiceBridge`;

  loadUsage();
  setInterval(loadUsage, 15000);
})();

async function logout() {
  try {
    const res = await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });

    const data = await res.json();
    console.log(data);

    // Clear UI after logout
    localStorage.removeItem("chatId");
    document.getElementById("messages").innerHTML = "";
    alert("Logged out");
  } catch (err) {
    console.error("Logout failed", err);
  }
}

// Load subscription + usage
async function loadUsage() {
  const { res, data } = await fetchJson(`${API}/subscription/me`);

  if (!res.ok || !data) {
    usageText.textContent = "Usage unavailable";
    return;
  }

  if (data.usage) {
    const u = data.usage;

    const chat = u.chat || { used: 0, limit: 0 };
    const tts = u.tts || { used: 0, limit: 0 };
    const stt = u.stt || { used: 0, limit: 0 };

    usageText.textContent = `Chat: ${chat.used}/${chat.limit} | TTS: ${tts.used}/${tts.limit} | STT: ${stt.used}/${stt.limit}`;
  } else {
    usageText.textContent = "Usage OK";
  }
}

// -------------------------
// CHAT
// -------------------------
chatSendBtn?.addEventListener("click", async () => {
  const text = chatInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  chatInput.value = "";

  const { res, data } = await fetchJson(`${API}/chat/send`, {
    method: "POST",
    body: JSON.stringify({ message: text })
  });

  if (!res.ok || !data) {
    appendMessage("ai", data?.msg || "Server error");
    return;
  }

  appendMessage("ai", data.reply || "No reply from server");

  loadUsage();
});

// Append chat messages to UI
function appendMessage(sender, text) {
  if (!chatMessages) return;

  const row = document.createElement("div");
  row.className = sender === "user" ? "text-right mb-2" : "text-left mb-2";

  const bubble = document.createElement("div");
  bubble.className =
    sender === "user"
      ? "inline-block bg-blue-600 text-white px-3 py-2 rounded-lg"
      : "inline-block bg-gray-200 text-gray-900 px-3 py-2 rounded-lg";

  bubble.textContent = text;

  // AI has a speaker button
  if (sender === "ai") {
    const speaker = document.createElement("button");
    speaker.innerText = "🔊";
    speaker.className = "ml-2 text-sm";
    speaker.onclick = () => playTTS(text);

    row.appendChild(bubble);
    row.appendChild(speaker);
  } else {
    row.appendChild(bubble);
  }

  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// TTS player
async function playTTS(text) {
  try {
    const res = await fetch(`${API}/tts`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) return alert("TTS failed");

    const audioBlob = await res.blob();
    const url = URL.createObjectURL(audioBlob);

    new Audio(url).play();
  } catch (err) {
    console.error("TTS error:", err);
  }
}

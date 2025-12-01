const API = "http://localhost:4000"; // Change to your backend URL
const textInput = document.getElementById("textInput");
const messagesDiv = document.getElementById("messages");
const audioElement = document.getElementById("tts-audio");

// ------------------ AUTH ------------------
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password })
  });

  if (res.ok) {
    alert("Login successful!");
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
  } else {
    const data = await res.json();
    alert(data.msg || "Login failed");
  }
}

async function registerUser() {
  const username = document.getElementById("regUsername").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;

  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  });

  if (res.ok) {
    alert("Registration successful! Please login.");
    showLogin();
  } else {
    const data = await res.json();
    alert(data.msg || "Registration failed");
  }
}

function showRegister() {
  document.getElementById("authSection").classList.add("hidden");
  document.getElementById("registerSection").classList.remove("hidden");
}

function showLogin() {
  document.getElementById("registerSection").classList.add("hidden");
  document.getElementById("authSection").classList.remove("hidden");
}

// ------------------ MESSAGES ------------------
function addMessage(text, sender = "user") {
  const div = document.createElement("div");
  div.textContent = text;
  div.className = sender === "user" ? "text-right mb-2" : "text-left mb-2";
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ------------------ TEXT TO SPEECH ------------------
async function sendTTS() {
  const text = textInput.value.trim();
  if (!text) return;

  addMessage(`You: ${text}`, "user");

  try {
    const res = await fetch(`${API}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      const data = await res.json();
      return alert(data.msg || "TTS failed");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioElement.src = url;
    audioElement.hidden = false;
    audioElement.play();

    addMessage(`🔊 Played: "${text}"`, "bot");

  } catch (err) {
    console.error(err);
    alert("TTS error, check backend logs");
  }

  textInput.value = "";
}

// ------------------ ENTER KEY ------------------
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendTTS();
  }
});

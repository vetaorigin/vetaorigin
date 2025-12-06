// auth.js
const API = "http://localhost:4000"; // change if your backend runs on a different port

// Elements
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authMessage = document.getElementById("authMessage");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

async function handleResponse(res) {
  // backend typically returns { msg: '...' } or { user: {...} }
  let data;
  try { data = await res.json(); } catch (e) { data = {}; }
  return { ok: res.ok, data };
}

// LOGIN
loginBtn.onclick = async () => {
  authMessage.textContent = "";
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    authMessage.textContent = "Email and password are required";
    return;
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      credentials: "include",          // important for session cookies
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const { ok, data } = await handleResponse(res);
    if (!ok) {
      authMessage.textContent = data?.msg || (data?.error?.message) || "Login failed";
      return;
    }

    // success -> redirect to dashboard
    window.location.href = "./index.html";
  } catch (err) {
    console.error("Login error", err);
    authMessage.textContent = "Login error, check console";
  }
};

// SIGNUP
registerBtn.onclick = async () => {
  authMessage.textContent = "";
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // if you have username field add handling here (your backend expects username)
  const usernameInput = document.getElementById("regUsername");
  const username = usernameInput ? usernameInput.value.trim() : null;

  if (!username && usernameInput) {
    authMessage.textContent = "Username is required";
    return;
  }
  if (!email || !password) {
    authMessage.textContent = "Email and password are required";
    return;
  }

  try {
    const body = username ? { username, email, password } : { email, password };
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      credentials: "include",         // important for session cookies
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const { ok, data } = await handleResponse(res);
    if (!ok) {
      authMessage.textContent = data?.msg || (data?.error?.message) || "Signup failed";
      return;
    }

    // signup success — redirect to dashboard (session cookie set)
    window.location.href = "./index.html";
  } catch (err) {
    console.error("Signup error", err);
    authMessage.textContent = "Signup error, check console";
  }
};

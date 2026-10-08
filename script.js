// --- Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");
const arcCore = document.getElementById("arc-core");
const batteryRow = document.getElementById("battery-row");

// Active models to try in order
const MODELS = ["gemini-1.5-flash", "gemini-2.0-flash"];

// Chat history buffer
let conversationHistory = [];

function setReactor(state) {
  if (!arcCore) return;
  const c = arcCore.querySelector(".center");
  if (!c) return;

  if (state === "listening") {
    c.style.background = "#ff0055";
    c.style.boxShadow = "0 0 35px #ff0055";
  } else if (state === "thinking") {
    c.style.background = "#ffb700";
    c.style.boxShadow = "0 0 35px #ffb700";
  } else {
    c.style.background = "#00e5ff";
    c.style.boxShadow = "0 0 35px #00e5ff";
  }
}

function add(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerHTML = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[*#_`~]/g, "").trim();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "en-US";
  u.rate = 1.0;
  u.pitch = 0.95;

  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith("en-GB") || v.lang.startsWith("en"));
  if (enVoice) u.voice = enVoice;

  u.onstart = () => setReactor("listening");
  u.onend = () => setReactor("idle");
  u.onerror = () => setReactor("idle");

  window.speechSynthesis.speak(u);
}

// Unlock audio on mobile touch
window.addEventListener("touchstart", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }
}, { once: true });

// Battery Diagnostics
async function getBatteryStatus() {
  if (navigator.getBattery && batteryRow) {
    try {
      const b = await navigator.getBattery();
      const update = () => {
        const level = Math.round(b.level * 100);
        const status = b.charging ? "CHARGING" : "ONLINE";
        batteryRow.innerHTML = `<span>POWER LEVEL</span><span class="status-val on">${level}% [${status}]</span>`;
      };
      update();
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
    } catch (e) {}
  }
}
getBatteryStatus();

// API Key Manager
function getApiKey() {
  let key = localStorage.getItem("GEMINI_API_KEY");
  if (!key || key.trim() === "") {
    key = prompt("Enter your Gemini API Key:");
    if (key && key.trim() !== "") {
      localStorage.setItem("GEMINI_API_KEY", key.trim());
      return key.trim();
    }
    return null;
  }
  return key.trim();
}

// Instant Local Handlers
function checkLocalCommand(cmd) {
  const clean = cmd.toLowerCase().trim();

  // Instant local time
  if (clean.includes("time") || clean.includes("time now")) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `The current time is ${timeStr}, Boss.`;
  }

  // Instant local date
  if (clean.includes("date today") || clean === "what is today" || clean === "date") {
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `Today is ${dateStr}, Boss.`;
  }

  // Music shortcut
  if (clean.includes("play music") || clean.includes("play song")) {
    setTimeout(() => window.open("https://music.youtube.com", "_blank"), 1000);
    return "Launching YouTube Music now, Boss.";
  }

  return null;
}

// Main Query Function
async function askJarvis(promptText) {
  add(`<span class="prefix">YOU:</span> ${promptText}`, "user");
  if (input) input.value = "";

  // 1. Check local fast-path commands first
  const localReply = checkLocalCommand(promptText);
  if (localReply) {
    add(`<span class="prefix">J.A.R.V.I.S:</span> ${localReply}`, 'ai');
    speak(localReply);
    return;
  }

  const key = getApiKey();
  if (!key) {
    add('<span class="prefix">J.A.R.V.I.S:</span> API Key required to initialize protocols.', 'ai');
    return;
  }

  add('<span class="prefix">J.A.R.V.I.S:</span> Processing...', 'ai');
  setReactor("thinking");

  // Keep a clean rolling context of last 6 exchanges
  conversationHistory.push({ role: "user", parts: [{ text: promptText }] });
  if (conversationHistory.length > 6) {
    conversationHistory = conversationHistory.slice(-6);
  }

  let finalReply = null;
  let lastErrorMsg = "";

  for (let model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: "You are J.A.R.V.I.S, Tony Stark's AI assistant. Always address the user as Boss. Respond sharply and concisely in 1 to 2 sentences." }]
          },
          contents: conversationHistory
        })
      });

      const data = await res.json();

      if (data.error) {
        lastErrorMsg = data.error.message || `Error ${data.error.code}`;
        // If API key is rejected
        if (data.error.code === 400 && data.error.message?.includes("API_KEY_INVALID")) {
          localStorage.removeItem("GEMINI_API_KEY");
          chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Key invalid. Resetting stored key.`;
          speak("Invalid API key, Boss.");
          setReactor("idle");
          return;
        }
        continue; // Try next model
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        finalReply = text;
        break;
      }
    } catch (err) {
      lastErrorMsg = err.message;
    }
  }

  if (finalReply) {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> ${finalReply}`;
    conversationHistory.push({ role: "model", parts: [{ text: finalReply }] });
    speak(finalReply);
  } else {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> ${lastErrorMsg || "Connection failed. Please retry."}`;
    speak("System error encountered, Boss.");
    conversationHistory.pop();
  }

  setReactor("idle");
}

// Action listeners
if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    const val = input ? input.value.trim() : "";
    if (val) askJarvis(val);
  });
}

if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = input.value.trim();
      if (val) askJarvis(val);
    }
  });
}

// Voice Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition && micBtn) {
  const rec = new SpeechRecognition();
  rec.lang = "en-US";
  rec.interimResults = false;

  micBtn.addEventListener("click", () => {
    try {
      setReactor("listening");
      micBtn.innerText = "🔴";
      rec.start();
    } catch (e) {
      rec.stop();
      micBtn.innerText = "🎤";
      setReactor("idle");
    }
  });

  rec.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    if (input) input.value = transcript;
    askJarvis(transcript);
  };

  rec.onend = () => {
    micBtn.innerText = "🎤";
    setReactor("idle");
  };

  rec.onerror = () => {
    micBtn.innerText = "🎤";
    setReactor("idle");
  };
}

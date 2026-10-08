// --- Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");
const arcCore = document.getElementById("arc-core");
const batteryRow = document.getElementById("battery-row");

// --- Model Configuration with Fallbacks ---
// If gemini-flash-latest hits temporary load limits, fallback triggers
const MODEL_TIERS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];

// --- State and Memory ---
let conversationHistory = [
  {
    role: "user",
    parts: [{ text: "You are J.A.R.V.I.S, Tony Stark's AI console. Address the user as Boss. Respond sharply in 1 or 2 concise sentences." }]
  },
  {
    role: "model",
    parts: [{ text: "Systems online and fully operational, Boss." }]
  }
];

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
  u.rate = 1.05;
  u.pitch = 0.95;

  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith("en-GB") || v.lang.startsWith("en"));
  if (enVoice) u.voice = enVoice;

  u.onstart = () => setReactor("listening");
  u.onend = () => setReactor("idle");
  u.onerror = () => setReactor("idle");

  window.speechSynthesis.speak(u);
}

// Unlock audio on mobile interaction
window.addEventListener("touchstart", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }
}, { once: true });

// Battery Telemetry
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

// AI Core Engine with Model Failover
async function askJarvis(promptText) {
  const key = getApiKey();
  if (!key) {
    add('<span class="prefix">J.A.R.V.I.S:</span> API Key required to initialize protocols.', 'ai');
    return;
  }

  add(`<span class="prefix">YOU:</span> ${promptText}`, "user");
  if (input) input.value = "";
  add('<span class="prefix">J.A.R.V.I.S:</span> Processing...', 'ai');
  setReactor("thinking");

  conversationHistory.push({ role: "user", parts: [{ text: promptText }] });

  let success = false;
  let reply = "";

  for (let model of MODEL_TIERS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: conversationHistory })
      });

      const data = await res.json();

      if (data.error) {
        if (data.error.code === 400 || data.error.status === "INVALID_ARGUMENT") {
          localStorage.removeItem("GEMINI_API_KEY");
          chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Key invalid. Resetting storage.`;
          setReactor("idle");
          return;
        }
        // If high-demand or rate limit, continue to the next model in tier
        continue;
      }

      reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        success = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (success && reply) {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> ${reply}`;
    conversationHistory.push({ role: "model", parts: [{ text: reply }] });
    speak(reply);
  } else {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> System busy across all network tiers. Try again shortly.`;
    speak("High demand on network, Boss.");
    conversationHistory.pop();
  }

  setReactor("idle");
}

// Action triggers
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

// Speech Recognition Trigger
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

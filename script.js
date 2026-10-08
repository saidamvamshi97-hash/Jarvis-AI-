// ========================================================
// J.A.R.V.I.S. HUD ENGINE: VISION, MEMORY & DUAL UPLINK
// ========================================================

// --- 1. DOM Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");
const camBtn = document.getElementById("cam-btn");
const cameraInput = document.getElementById("camera-input");
const clearBtn = document.getElementById("clear-btn");
const arcCore = document.getElementById("arc-core");
const batteryRow = document.getElementById("battery-row");

// --- 2. Persistent Long-Term Memory Controller ---
const MEMORY_STORAGE_KEY = "JARVIS_PERSISTENT_MEMORY";
let conversationHistory = [];

try {
  const saved = localStorage.getItem(MEMORY_STORAGE_KEY);
  conversationHistory = saved ? JSON.parse(saved) : [];
} catch (e) {
  conversationHistory = [];
}

function persistMemory() {
  try {
    // Keep last 10 turns to avoid payload bloating
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(conversationHistory.slice(-10)));
  } catch (e) {}
}

// Clear Memory Button Handler
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    HAPTICS.confirm();
    conversationHistory = [];
    localStorage.removeItem(MEMORY_STORAGE_KEY);
    add('<span class="prefix">J.A.R.V.I.S:</span> Long-term memory cleared, Boss.', 'ai');
    speak("Memory wiped, Boss.");
  });
}

// --- 3. Hardware Haptics & Torch Engine ---
let cameraStream = null;
let torchTrack = null;

const HAPTICS = {
  tap: () => { if (navigator.vibrate) navigator.vibrate(25); },
  confirm: () => { if (navigator.vibrate) navigator.vibrate([40, 50, 60]); },
  error: () => { if (navigator.vibrate) navigator.vibrate([80, 40, 80]); }
};

async function toggleTorch(turnOn) {
  try {
    if (turnOn) {
      if (!cameraStream) {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
      }
      torchTrack = cameraStream.getVideoTracks()[0];
      const capabilities = torchTrack.getCapabilities ? torchTrack.getCapabilities() : {};
      if (capabilities.torch) {
        await torchTrack.applyConstraints({ advanced: [{ torch: true }] });
        return true;
      }
      return false;
    } else {
      if (torchTrack) {
        await torchTrack.applyConstraints({ advanced: [{ torch: false }] });
        torchTrack.stop();
        cameraStream = null;
        torchTrack = null;
      }
      return true;
    }
  } catch (err) {
    console.warn("Torch hardware restricted:", err);
    return false;
  }
}

// --- 4. Reactive Arc Reactor HUD ---
function setReactor(state) {
  if (!arcCore) return;
  const centerRing = arcCore.querySelector(".center");
  if (!centerRing) return;

  if (state === "listening") {
    centerRing.style.background = "#ff0055";
    centerRing.style.boxShadow = "0 0 35px #ff0055";
  } else if (state === "thinking") {
    centerRing.style.background = "#ffaa00";
    centerRing.style.boxShadow = "0 0 35px #ffaa00";
  } else if (state === "speaking") {
    centerRing.style.background = "#00ffaa";
    centerRing.style.boxShadow = "0 0 35px #00ffaa";
  } else {
    centerRing.style.background = "#00e5ff";
    centerRing.style.boxShadow = "0 0 35px #00e5ff";
  }
}

// --- 5. Message Logging ---
function add(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerHTML = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- 6. Mobile Speech Synthesis ---
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const clean = text.replace(/[*#_`~]/g, "").trim();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "en-US";
  utterance.rate = 1.05;
  utterance.pitch = 0.95;

  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith("en-GB") || v.lang.startsWith("en-US") || v.lang.startsWith("en"));
  if (enVoice) utterance.voice = enVoice;

  utterance.onstart = () => setReactor("speaking");
  utterance.onend = () => setReactor("idle");
  utterance.onerror = () => setReactor("idle");

  window.speechSynthesis.speak(utterance);
}

window.addEventListener("touchstart", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }
}, { once: true });

// --- 7. Hardware Battery Telemetry ---
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

// --- 8. API Key Manager ---
function getApiKey() {
  return localStorage.getItem("GEMINI_API_KEY") || null;
}

// --- 9. Local Hardware & Fast Commands ---
function checkLocalCommand(cmd) {
  const clean = cmd.toLowerCase().trim();

  // Instant local time
  if (clean.includes("time") || clean.includes("time now")) {
    HAPTICS.tap();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `The current time is ${timeStr}, Boss.`;
  }

  // Instant local date
  if (clean.includes("date today") || clean === "what is today" || clean === "date") {
    HAPTICS.tap();
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `Today is ${dateStr}, Boss.`;
  }

  // Torch controls
  if (clean.includes("torch on") || clean.includes("flashlight on") || clean.includes("lights on")) {
    HAPTICS.confirm();
    toggleTorch(true).then((ok) => {
      const msg = ok ? "Illumination active, Boss." : "Torch hardware unavailable on this browser.";
      add(`<span class="prefix">J.A.R.V.I.S:</span> ${msg}`, 'ai');
      speak(msg);
    });
    return "Engaging illumination protocols...";
  }

  if (clean.includes("torch off") || clean.includes("flashlight off") || clean.includes("lights off")) {
    HAPTICS.confirm();
    toggleTorch(false);
    return "Illumination deactivated, Boss.";
  }

  // Media shortcuts
  if (clean.includes("play music") || clean.includes("play song") || clean.includes("play some music")) {
    HAPTICS.confirm();
    setTimeout(() => window.open("https://music.youtube.com", "_blank"), 1000);
    return "Launching YouTube Music now, Boss.";
  }

  if (clean.startsWith("open youtube")) {
    HAPTICS.confirm();
    setTimeout(() => window.open("https://www.youtube.com", "_blank"), 1000);
    return "Opening YouTube, Boss.";
  }

  return null;
}

// --- 10. Autonomous Dual-Tier AI Text Uplink ---
async function askJarvis(promptText) {
  HAPTICS.tap();
  add(`<span class="prefix">YOU:</span> ${promptText}`, "user");
  if (input) input.value = "";

  const localReply = checkLocalCommand(promptText);
  if (localReply) {
    add(`<span class="prefix">J.A.R.V.I.S:</span> ${localReply}`, 'ai');
    speak(localReply);
    return;
  }

  add('<span class="prefix">J.A.R.V.I.S:</span> Processing...', 'ai');
  setReactor("thinking");

  conversationHistory.push({ role: "user", parts: [{ text: promptText }] });
  if (conversationHistory.length > 8) {
    conversationHistory = conversationHistory.slice(-8);
  }

  let finalReply = null;
  const key = getApiKey();

  // Tier 1: Gemini Primary
  if (key) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
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
      if (!data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        finalReply = data.candidates[0].content.parts[0].text;
      }
    } catch (err) {}
  }

  // Tier 2: Free Satellite Fallback (Keyless & Unlimited)
  if (!finalReply) {
    try {
      const sysInstruction = encodeURIComponent("You are J.A.R.V.I.S, Tony Stark's AI assistant. Address the user as Boss. Respond sharply in 1-2 sentences.");
      const promptClean = encodeURIComponent(promptText);
      const satelliteUrl = `https://text.pollinations.ai/${promptClean}?system=${sysInstruction}`;

      const backupRes = await fetch(satelliteUrl);
      if (backupRes.ok) {
        const text = await backupRes.text();
        if (text && text.trim().length > 0) {
          finalReply = text.trim();
        }
      }
    } catch (err) {}
  }

  if (finalReply) {
    HAPTICS.confirm();
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> ${finalReply}`;
    conversationHistory.push({ role: "model", parts: [{ text: finalReply }] });
    persistMemory();
    speak(finalReply);
  } else {
    HAPTICS.error();
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Uplink offline. Please check network.`;
    speak("Uplink disrupted, Boss.");
    conversationHistory.pop();
  }

  setReactor("idle");
}

// --- 11. Computer Vision ("Eyes") Engine ---
if (camBtn && cameraInput) {
  camBtn.addEventListener("click", () => {
    HAPTICS.tap();
    cameraInput.click();
  });

  cameraInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    add('<span class="prefix">YOU:</span> [Visual Telemetry Provided]', 'user');
    add('<span class="prefix">J.A.R.V.I.S:</span> Analyzing visual feed...', 'ai');
    setReactor("thinking");

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      await analyzeVisualData(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  });
}

async function analyzeVisualData(base64Image, mimeType) {
  const key = getApiKey();
  let visionReply = null;

  if (key) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "You are J.A.R.V.I.S. Describe what you see in front of you in 1-2 sharp, professional sentences addressing Boss." },
              { inline_data: { mime_type: mimeType, data: base64Image } }
            ]
          }]
        })
      });

      const data = await res.json();
      if (!data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        visionReply = data.candidates[0].content.parts[0].text;
      }
    } catch (err) {
      console.warn("Gemini vision analysis failed:", err);
    }
  }

  if (visionReply) {
    HAPTICS.confirm();
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> ${visionReply}`;
    conversationHistory.push({ role: "user", parts: [{ text: "[Sent image for visual analysis]" }] });
    conversationHistory.push({ role: "model", parts: [{ text: visionReply }] });
    persistMemory();
    speak(visionReply);
  } else {
    HAPTICS.error();
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Visual optical feed failed to process, Boss.`;
    speak("Vision scan failed, Boss.");
  }

  setReactor("idle");
}

// --- 12. Input & Speech Recognition Event Handlers ---
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

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition && micBtn) {
  const rec = new SpeechRecognition();
  rec.lang = "en-US";
  rec.interimResults = false;

  micBtn.addEventListener("click", () => {
    try {
      HAPTICS.tap();
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

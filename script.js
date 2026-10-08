// ==========================================
// J.A.R.V.I.S. HUD & CORE INTELLIGENCE ENGINE
// ==========================================

// --- 1. DOM Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");
const arcCore = document.querySelector(".core");
const statusPanel = document.querySelector(".status");

// --- 2. Futuristic Web Audio Synthesizer (UI Tones) ---
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
}

function playTone(freq, type, duration, delay = 0) {
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
  } catch (e) {
    console.warn("Audio effect error:", e);
  }
}

const UI_AUDIO = {
  click: () => playTone(880, "sine", 0.08),
  listening: () => {
    playTone(520, "sine", 0.1, 0);
    playTone(780, "sine", 0.15, 0.08);
  },
  complete: () => {
    playTone(659, "triangle", 0.1, 0);
    playTone(880, "sine", 0.18, 0.1);
  },
  error: () => {
    playTone(180, "sawtooth", 0.25, 0);
  }
};

// --- 3. Reactive Arc Reactor HUD Controller ---
function setReactorState(state) {
  if (!arcCore) return;
  const centerRing = arcCore.querySelector(".center");
  if (!centerRing) return;

  if (state === "listening") {
    centerRing.style.boxShadow = "0 0 35px #ff0055";
    centerRing.style.background = "#ff0055";
  } else if (state === "thinking") {
    centerRing.style.boxShadow = "0 0 45px #ffaa00";
    centerRing.style.background = "#ffaa00";
  } else if (state === "speaking") {
    centerRing.style.boxShadow = "0 0 45px #00ffaa";
    centerRing.style.background = "#00ffaa";
  } else {
    centerRing.style.boxShadow = "0 0 30px #0ff";
    centerRing.style.background = "#0ff";
  }
}

// --- 4. Mobile-Optimized Speech Synthesis Engine ---
function speak(text) {
  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported in this browser.");
    return;
  }

  // Cancel any stalled audio utterances
  window.speechSynthesis.cancel();

  // Strip Markdown characters (*, #, _, `, ~) so speech reads naturally
  const cleanText = text.replace(/[*#_`~]/g, "").trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);

  utterance.rate = 1.0;
  utterance.pitch = 0.95;
  utterance.lang = "en-US";

  // Select preferred English voice
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith("en-GB") || v.lang.startsWith("en-US") || v.lang.startsWith("en"));
  if (enVoice) {
    utterance.voice = enVoice;
  }

  utterance.onstart = () => {
    setReactorState("speaking");
  };
  utterance.onend = () => {
    setReactorState("idle");
  };
  utterance.onerror = (e) => {
    console.error("SpeechSynthesis error:", e);
    setReactorState("idle");
  };

  window.speechSynthesis.speak(utterance);
}

// Pre-load voices and unlock browser audio on the first screen tap
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };

  const unlockAudioEngine = () => {
    initAudio();
    // Warm up the mobile speech synthesizer
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    window.removeEventListener("touchstart", unlockAudioEngine);
    window.removeEventListener("click", unlockAudioEngine);
  };

  window.addEventListener("touchstart", unlockAudioEngine, { once: true });
  window.addEventListener("click", unlockAudioEngine, { once: true });
}

// --- 5. Hardware Telemetry & Real-Time Battery Monitor ---
async function initTelemetry() {
  if (navigator.getBattery && statusPanel) {
    try {
      const battery = await navigator.getBattery();
      const updateBatteryUI = () => {
        let batRow = document.getElementById("diag-battery");
        if (!batRow) {
          batRow = document.createElement("div");
          batRow.id = "diag-battery";
          batRow.className = "row";
          statusPanel.appendChild(batRow);
        }
        const level = Math.round(battery.level * 100);
        const status = battery.charging ? "CHARGING" : "ONLINE";
        batRow.innerHTML = `<span>POWER LEVEL</span><span class="on">${level}% [${status}]</span>`;
      };

      updateBatteryUI();
      battery.addEventListener("levelchange", updateBatteryUI);
      battery.addEventListener("chargingchange", updateBatteryUI);
    } catch (e) {
      console.warn("Battery telemetry unavailable:", e);
    }
  }
}
initTelemetry();

// --- 6. Multi-Turn Persistent Conversation Memory ---
const INITIAL_SYSTEM_PROMPT = {
  role: "user",
  parts: [{ 
    text: "You are J.A.R.V.I.S, Tony Stark's futuristic, ultra-intelligent AI assistant. Always address the user as Boss. Keep your responses concise (1 to 2 sentences), sharp, confident, and professional." 
  }]
};

let conversationHistory = [];
try {
  const cachedHistory = sessionStorage.getItem("JARVIS_HISTORY");
  conversationHistory = cachedHistory ? JSON.parse(cachedHistory) : [
    INITIAL_SYSTEM_PROMPT,
    { role: "model", parts: [{ text: "Systems online and fully operational, Boss. Ready for instructions." }] }
  ];
} catch (e) {
  conversationHistory = [INITIAL_SYSTEM_PROMPT];
}

function persistMemory() {
  try {
    sessionStorage.setItem("JARVIS_HISTORY", JSON.stringify(conversationHistory.slice(-10)));
  } catch (e) {}
}

// --- 7. Append Message Helper ---
function add(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerText = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- 8. Autonomous Command & Web Action Router ---
function executeAutonomousAction(command) {
  const text = command.toLowerCase().trim();

  // Play music action
  if (text.includes("play music") || text.includes("play song") || text.includes("play some music")) {
    setTimeout(() => window.open("https://music.youtube.com", "_blank"), 1200);
    return true;
  }
  // Open YouTube
  if (text.startsWith("open youtube")) {
    setTimeout(() => window.open("https://www.youtube.com", "_blank"), 1200);
    return true;
  }
  // Maps & Location
  if (text.includes("navigate to") || text.includes("where is")) {
    const query = text.replace(/navigate to|where is/gi, "").trim();
    if (query) {
      setTimeout(() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, "_blank"), 1200);
      return true;
    }
  }
  // Google Search
  if (text.startsWith("google ") || text.startsWith("search for ")) {
    const query = text.replace(/google |search for /gi, "").trim();
    if (query) {
      setTimeout(() => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank"), 1200);
      return true;
    }
  }
  // Wikipedia Dossier
  if (text.startsWith("lookup ") || text.startsWith("who is ")) {
    const query = text.replace(/lookup |who is /gi, "").trim();
    if (query) {
      setTimeout(() => window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`, "_blank"), 1200);
      return true;
    }
  }
  return false;
}

// --- 9. API Key Access ---
function getApiKey() {
  let key = localStorage.getItem("GEMINI_API_KEY");
  if (!key || key.trim() === "") {
    key = prompt("Enter your Google Gemini API Key:");
    if (key && key.trim() !== "") {
      localStorage.setItem("GEMINI_API_KEY", key.trim());
      return key.trim();
    }
    return null;
  }
  return key.trim();
}

// --- 10. Core AI Pipeline ---
async function askGemini(promptText) {
  const currentKey = getApiKey();
  if (!currentKey) {
    add("J.A.R.V.I.S: API key required to operate.", "ai");
    speak("API key required, Boss.");
    return;
  }

  add("YOU: " + promptText, "user");
  if (input) input.value = "";
  add("J.A.R.V.I.S: Processing...", "ai");
  setReactorState("thinking");

  conversationHistory.push({
    role: "user",
    parts: [{ text: promptText }]
  });

  executeAutonomousAction(promptText);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${currentKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: conversationHistory
      })
    });

    const data = await response.json();

    if (data.error) {
      const errMsg = data.error.message || "Protocol mismatch";
      chat.lastChild.innerText = "J.A.R.V.I.S: Error - " + errMsg;
      UI_AUDIO.error();
      speak("System error encountered, Boss.");
      conversationHistory.pop();
      setReactorState("idle");

      if (data.error.code === 400 || data.error.status === "INVALID_ARGUMENT") {
        localStorage.removeItem("GEMINI_API_KEY");
      }
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "All systems nominal, Boss.";
    chat.lastChild.innerText = "J.A.R.V.I.S: " + reply;

    conversationHistory.push({
      role: "model",
      parts: [{ text: reply }]
    });
    persistMemory();

    UI_AUDIO.complete();
    speak(reply);
  } catch (err) {
    chat.lastChild.innerText = "J.A.R.V.I.S: Uplink failed - " + err.message;
    UI_AUDIO.error();
    speak("Uplink disrupted, Boss.");
    conversationHistory.pop();
    setReactorState("idle");
  }
}

// --- 11. Event Handlers ---
if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    UI_AUDIO.click();
    const text = input ? input.value.trim() : "";
    if (text) askGemini(text);
  });
}

if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      UI_AUDIO.click();
      const text = input.value.trim();
      if (text) askGemini(text);
    }
  });
}

// --- 12. Voice Recognition Protocol ---
if (micBtn) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    micBtn.addEventListener("click", () => {
      try {
        UI_AUDIO.listening();
        setReactorState("listening");
        micBtn.innerText = "🔴";
        recognition.start();
      } catch (e) {
        recognition.stop();
        setReactorState("idle");
        micBtn.innerText = "🎤";
      }
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (input) input.value = transcript;
      askGemini(transcript);
    };

    recognition.onend = () => {
      micBtn.innerText = "🎤";
    };

    recognition.onerror = () => {
      micBtn.innerText = "🎤";
      setReactorState("idle");
    };
  } else {
    micBtn.style.display = "none";
  }
}

// ==========================================
// J.A.R.V.I.S. HUD & CORE INTELLIGENCE ENGINE
// ==========================================

// --- 1. DOM Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");
const arcCore = document.getElementById("arc-core") || document.querySelector(".core");
const statusPanel = document.querySelector(".status");
const clockEl = document.getElementById("hud-clock");
const canvas = document.getElementById("waveform");
const canvasCtx = canvas ? canvas.getContext("2d") : null;

// --- 2. Live HUD Clock ---
function startClock() {
  function updateTime() {
    if (!clockEl) return;
    const now = new Date();
    clockEl.innerText = now.toTimeString().split(" ")[0];
  }
  updateTime();
  setInterval(updateTime, 1000);
}
startClock();

// --- 3. Futuristic Web Audio Synthesizer & Analyser ---
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let analyserNode = null;

function initAudio() {
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 64;
    startWaveformLoop();
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
    gain.connect(analyserNode || audioCtx.destination);
    if (analyserNode) analyserNode.connect(audioCtx.destination);

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

// --- 4. Live Audio Waveform Canvas Animation ---
function startWaveformLoop() {
  if (!canvasCtx || !analyserNode) return;
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);
    analyserNode.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 1.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      canvasCtx.fillStyle = `rgba(0, 255, 255, ${dataArray[i] / 255 + 0.2})`;
      canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 2;
    }
  }
  draw();
}

// --- 5. Reactive Arc Reactor HUD Controller ---
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

// --- 6. Mobile-Optimized Speech Synthesis Engine ---
function speak(text) {
  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const cleanText = text.replace(/[*#_`~]/g, "").trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);

  utterance.rate = 1.0;
  utterance.pitch = 0.95;
  utterance.lang = "en-US";

  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith("en-GB") || v.lang.startsWith("en-US") || v.lang.startsWith("en"));
  if (enVoice) {
    utterance.voice = enVoice;
  }

  utterance.onstart = () => {
    setReactorState("speaking");
  };
  utterance.onend = () => {
    setReactorState(isContinuousListening ? "listening" : "idle");
  };
  utterance.onerror = (e) => {
    console.error("SpeechSynthesis error:", e);
    setReactorState(isContinuousListening ? "listening" : "idle");
  };

  window.speechSynthesis.speak(utterance);
}

// Pre-load voices and unlock browser audio on user interaction
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };

  const unlockAudioEngine = () => {
    initAudio();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    window.removeEventListener("touchstart", unlockAudioEngine);
    window.removeEventListener("click", unlockAudioEngine);
  };

  window.addEventListener("touchstart", unlockAudioEngine, { once: true });
  window.addEventListener("click", unlockAudioEngine, { once: true });
}

// --- 7. Hardware & Environmental Telemetry ---
let currentWeatherReport = "Weather telemetry unavailable at this time, Boss.";

async function initTelemetry() {
  // Device Battery Monitor
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

  // Live Weather Telemetry via Geolocation
  if (navigator.geolocation && statusPanel) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();

        if (data && data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const wind = data.current_weather.windspeed;
          currentWeatherReport = `Current temperature is ${temp}°C with wind speeds of ${wind} kilometers per hour.`;

          let weatherRow = document.getElementById("diag-weather");
          if (!weatherRow) {
            weatherRow = document.createElement("div");
            weatherRow.id = "diag-weather";
            weatherRow.className = "row";
            statusPanel.appendChild(weatherRow);
          }
          weatherRow.innerHTML = `<span>LOCAL ATMO</span><span class="on">${temp}°C [${wind} KM/H]</span>`;
        }
      } catch (err) {
        console.warn("Weather fetch failed:", err);
      }
    }, (err) => {
      console.warn("Geolocation bypassed:", err.message);
    });
  }
}
initTelemetry();

// --- 8. Multi-Turn Persistent Conversation Memory ---
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

// --- 9. Append Message Helper ---
function add(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerText = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- 10. Autonomous Command & Web Action Router ---
function executeAutonomousAction(command) {
  const text = command.toLowerCase().trim();

  // Local Weather Briefing
  if (text.includes("weather") || text.includes("temperature") || text.includes("atmospheric conditions")) {
    setTimeout(() => {
      speak(currentWeatherReport);
      add("J.A.R.V.I.S: " + currentWeatherReport, "ai");
    }, 600);
    return true;
  }
  // Play Music Action
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

// --- 11. API Key Access ---
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

// --- 12. Core AI Pipeline ---
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
      setReactorState(isContinuousListening ? "listening" : "idle");

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
    setReactorState(isContinuousListening ? "listening" : "idle");
  }
}

// --- 13. Event Handlers ---
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

// --- 14. Continuous Wake-Word & Voice Recognition Protocol ---
let isContinuousListening = false;
let recognition = null;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition && micBtn) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  function startListeningLoop() {
    try {
      isContinuousListening = true;
      micBtn.innerText = "⚡";
      micBtn.style.background = "rgba(0, 255, 255, 0.4)";
      micBtn.title = "Wake Word Active ('Hey Jarvis')";
      UI_AUDIO.listening();
      setReactorState("listening");
      recognition.start();
      add("SYSTEM: Hands-free wake-word active. Say 'Hey Jarvis...'", "ai");
    } catch (e) {
      console.warn("Recognition start error:", e);
    }
  }

  function stopListeningLoop() {
    isContinuousListening = false;
    micBtn.innerText = "🎤";
    micBtn.style.background = "";
    micBtn.title = "Voice Command";
    setReactorState("idle");
    try {
      recognition.stop();
    } catch (e) {}
  }

  micBtn.addEventListener("click", () => {
    if (!isContinuousListening) {
      startListeningLoop();
    } else {
      stopListeningLoop();
    }
  });

  recognition.onresult = (event) => {
    const lastResultIndex = event.results.length - 1;
    const rawTranscript = event.results[lastResultIndex][0].transcript.trim();
    const cleanLower = rawTranscript.toLowerCase();

    if (cleanLower.includes("jarvis") || cleanLower.includes("hey jarvis")) {
      const command = rawTranscript.replace(/hey jarvis|jarvis/gi, "").trim();
      UI_AUDIO.click();

      if (command.length > 0) {
        if (input) input.value = command;
        askGemini(command);
      } else {
        speak("Online and listening, Boss.");
      }
    }
  };

  recognition.onend = () => {
    if (isContinuousListening) {
      try {
        recognition.start();
      } catch (e) {
        setTimeout(() => {
          if (isContinuousListening) recognition.start();
        }, 500);
      }
    } else {
      micBtn.innerText = "🎤";
      setReactorState("idle");
    }
  };

  recognition.onerror = (e) => {
    if (e.error !== "no-speech") {
      console.warn("Speech error:", e.error);
    }
    if (!isContinuousListening) {
      micBtn.innerText = "🎤";
      setReactorState("idle");
    }
  };
} else if (micBtn) {
  micBtn.style.display = "none";
}

/**
 * J.A.R.V.I.S. Core Operating System
 * Multi-Turn Memory | Web Speech Pipeline | Gemini API Gateway | Hardware Telemetry
 */

// --- 1. DOM Handles ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");
const reactorCore = document.getElementById("reactor-core");
const coreStateText = document.getElementById("core-state-text");
const memoryBadge = document.getElementById("memory-status");
const netBadge = document.getElementById("net-status");

// --- 2. Synthetic Audio Cues (Web Audio API) ---
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playTone(freq, type, duration, delay = 0) {
  try {
    if (!audioCtx && AudioContextClass) audioCtx = new AudioContextClass();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);

    gain.gain.setValueAtTime(0.06, audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
  } catch (e) {
    console.warn("Audio failure:", e);
  }
}

const SFX = {
  click: () => playTone(840, "sine", 0.05),
  listen: () => {
    playTone(520, "sine", 0.08, 0);
    playTone(780, "sine", 0.12, 0.06);
  },
  reply: () => {
    playTone(660, "triangle", 0.08, 0);
    playTone(880, "sine", 0.15, 0.07);
  },
  error: () => playTone(180, "sawtooth", 0.22, 0)
};

// --- 3. Reactive Arc Reactor HUD ---
function setCoreState(state) {
  if (!reactorCore) return;
  reactorCore.classList.remove("listening", "thinking", "speaking");

  if (state === "listening") {
    reactorCore.classList.add("listening");
    if (coreStateText) coreStateText.innerText = "LISTENING...";
  } else if (state === "thinking") {
    reactorCore.classList.add("thinking");
    if (coreStateText) coreStateText.innerText = "PROCESSING...";
  } else if (state === "speaking") {
    reactorCore.classList.add("speaking");
    if (coreStateText) coreStateText.innerText = "VOICE TRANSMISSION";
  } else {
    if (coreStateText) coreStateText.innerText = "CORE ACTIVE";
  }
}

// --- 4. Network & Hardware Telemetry ---
window.addEventListener("online", () => {
  if (netBadge) {
    netBadge.innerText = "● ONLINE";
    netBadge.className = "badge online";
  }
});

window.addEventListener("offline", () => {
  if (netBadge) {
    netBadge.innerText = "● OFFLINE";
    netBadge.className = "badge locked";
  }
});

// --- 5. Persistent Session Memory ---
const SYSTEM_PROMPT = {
  role: "user",
  parts: [{
    text: "You are J.A.R.V.I.S, Tony Stark's futuristic, ultra-intelligent AI assistant. Always address the user as Boss. Answer in 1 to 2 sharp, concise sentences. You remember previous interactions in this session."
  }]
};

let conversationHistory = [];
try {
  const cached = sessionStorage.getItem("JARVIS_SESSION_MEMORY");
  conversationHistory = cached ? JSON.parse(cached) : [
    SYSTEM_PROMPT,
    { role: "model", parts: [{ text: "Systems online and fully operational, Boss. Ready for commands." }] }
  ];
} catch (e) {
  conversationHistory = [SYSTEM_PROMPT];
}

function saveHistory() {
  try {
    sessionStorage.setItem("JARVIS_SESSION_MEMORY", JSON.stringify(conversationHistory.slice(-12)));
    if (memoryBadge) {
      memoryBadge.innerText = `● ACTIVE (${Math.max(0, Math.floor((conversationHistory.length - 2) / 2))})`;
    }
  } catch (e) {}
}

// --- 6. Append Message to Terminal ---
function addMsg(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerHTML = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- 7. Voice Output (Speak Pipeline) ---
function speak(text) {
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 1.05;
      utt.pitch = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const eng = voices.find(v => v.lang.startsWith("en-GB") || v.lang.startsWith("en-US"));
      if (eng) utt.voice = eng;

      utt.onstart = () => setCoreState("speaking");
      utt.onend = () => setCoreState("idle");
      utt.onerror = () => setCoreState("idle");

      window.speechSynthesis.speak(utt);
    }
  } catch (e) {
    setCoreState("idle");
  }
}

// --- 8. Autonomous Task Router ---
function executeAutonomousTask(rawText) {
  const query = rawText.toLowerCase().trim();

  if (query.includes("play music") || query.includes("play song") || query.includes("play some music")) {
    setTimeout(() => window.open("https://music.youtube.com", "_blank"), 1000);
    return true;
  }
  if (query.startsWith("open youtube")) {
    setTimeout(() => window.open("https://www.youtube.com", "_blank"), 1000);
    return true;
  }
  if (query.startsWith("google ") || query.startsWith("search for ")) {
    const q = rawText.replace(/google |search for /gi, "").trim();
    if (q) setTimeout(() => window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank"), 1000);
    return true;
  }
  if (query.includes("where is") || query.includes("navigate to")) {
    const dest = rawText.replace(/where is|navigate to/gi, "").trim();
    if (dest) setTimeout(() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(dest)}`, "_blank"), 1000);
    return true;
  }
  return false;
}

// --- 9. Key Management ---
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

// --- 10. Gemini AI Pipeline (Think Engine) ---
async function askJarvis(promptText) {
  const apiKey = getApiKey();
  if (!apiKey) {
    addMsg("<strong>J.A.R.V.I.S:</strong> API key required to operate.", "ai");
    speak("API key required, Boss.");
    return;
  }

  addMsg("<strong>YOU:</strong> " + promptText, "user");
  if (input) input.value = "";
  addMsg("<strong>J.A.R.V.I.S:</strong> Processing...", "ai");
  setCoreState("thinking");

  conversationHistory.push({
    role: "user",
    parts: [{ text: promptText }]
  });

  executeAutonomousTask(promptText);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: conversationHistory })
    });

    const data = await response.json();

    if (data.error) {
      const errMsg = data.error.message || "Command failure";
      chat.lastChild.innerHTML = "<strong>J.A.R.V.I.S:</strong> Error - " + errMsg;
      SFX.error();
      conversationHistory.pop();
      setCoreState("idle");

      if (data.error.code === 400 || data.error.status === "INVALID_ARGUMENT") {
        localStorage.removeItem("GEMINI_API_KEY");
      }
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "All systems nominal, Boss.";
    chat.lastChild.innerHTML = "<strong>J.A.R.V.I.S:</strong> " + reply;

    conversationHistory.push({
      role: "model",
      parts: [{ text: reply }]
    });
    saveHistory();

    SFX.reply();
    speak(reply);
  } catch (err) {
    chat.lastChild.innerHTML = "<strong>J.A.R.V.I.S:</strong> Uplink interrupted - " + err.message;
    SFX.error();
    conversationHistory.pop();
    setCoreState("idle");
  }
}

// --- 11. Event Listeners ---
if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    SFX.click();
    const val = input ? input.value.trim() : "";
    if (val) askJarvis(val);
  });
}

if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      SFX.click();
      const val = input.value.trim();
      if (val) askJarvis(val);
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
        SFX.listen();
        setCoreState("listening");
        micBtn.classList.add("listening");
        micBtn.innerText = "🔴";
        recognition.start();
      } catch (e) {
        recognition.stop();
        setCoreState("idle");
        micBtn.classList.remove("listening");
        micBtn.innerText = "🎤";
      }
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (input) input.value = transcript;
      askJarvis(transcript);
    };

    recognition.onend = () => {
      micBtn.classList.remove("listening");
      micBtn.innerText = "🎤";
      if (reactorCore && !reactorCore.classList.contains("speaking")) {
        setCoreState("idle");
      }
    };

    recognition.onerror = () => {
      micBtn.classList.remove("listening");
      micBtn.innerText = "🎤";
      setCoreState("idle");
    };
  } else {
    micBtn.style.display = "none";
  }
}

saveHistory();

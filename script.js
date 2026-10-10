// =========================================================================
// J.A.R.V.I.S. PRO FRONTEND SPEECH & DEVICE CONTROL ENGINE
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;

// 1. Dynamic Orb Visual Indicator
function setJarvisVisualState(state) {
  const orb = document.querySelector(".orb-inner");
  const ring = document.querySelector(".orb-ring");
  const glow = document.querySelector(".orb-glow");
  if (!orb) return;

  if (state === "IDLE") {
    orb.style.backgroundColor = "#00ffff";
    orb.style.boxShadow = "0 0 25px #00ffff";
    if (ring) ring.style.borderColor = "#00ffff";
    if (glow) glow.style.background = "radial-gradient(circle, rgba(0,255,255,0.4) 0%, rgba(0,255,255,0) 70%)";
  } else if (state === "LISTENING") {
    orb.style.backgroundColor = "#00ff77";
    orb.style.boxShadow = "0 0 35px #00ff77";
    if (ring) ring.style.borderColor = "#00ff77";
    if (glow) glow.style.background = "radial-gradient(circle, rgba(0,255,119,0.5) 0%, rgba(0,255,119,0) 70%)";
  } else if (state === "THINKING") {
    orb.style.backgroundColor = "#ff9900";
    orb.style.boxShadow = "0 0 40px #ff9900";
    if (ring) ring.style.borderColor = "#ff9900";
    if (glow) glow.style.background = "radial-gradient(circle, rgba(255,153,0,0.5) 0%, rgba(255,153,0) 0%)";
  }
}

// 2. Intent Action Router (Executes Native Apps & Actions)
function handleActionCommands(rawPrompt) {
  const p = rawPrompt.toLowerCase().trim();

  // YouTube Launch & Search
  if (p.includes("youtube") || p.includes("play song") || p.includes("song play")) {
    let query = "";
    if (p.includes("play")) {
      query = p.replace(/.*play/, "").replace("on youtube", "").replace("in youtube", "").trim();
    } else if (p.includes("search")) {
      query = p.replace(/.*search/, "").replace("on youtube", "").trim();
    }

    displayAndSpeak(
      query ? `Searching YouTube for "${query}", Boss.` : "Opening YouTube, Boss.",
      () => {
        const dest = query 
          ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` 
          : "https://www.youtube.com";
        window.location.href = dest;
      }
    );
    return true;
  }

  // Google Search
  if (p.includes("search google") || p.includes("google search") || p.startsWith("google ")) {
    const query = p.replace("search google for", "").replace("google search", "").replace("google", "").trim();
    displayAndSpeak(`Searching Google for ${query}, Boss.`, () => {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    });
    return true;
  }

  return false;
}

function displayAndSpeak(text, onComplete) {
  const box = document.getElementById("responseBox");
  if (box) box.innerText = text;
  speakVoice(text, onComplete);
}

// 3. Hotword Listener ("Hey Jarvis")
function initWakeWordEngine() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = false;
  wakeRecognition.lang = "en-IN";

  wakeRecognition.onresult = (event) => {
    const current = event.resultIndex;
    const text = event.results[current][0].transcript.trim().toLowerCase();
    console.log("[Wake Mic Heard]:", text);

    if (text.includes("hey jarvis") || text.includes("jarvis") || text.includes("hai jarvis") || text.includes("service")) {
      console.log("Wake word recognized!");
      displayAndSpeak("Yes Boss, listening.", () => startCommandListening());
    }
  };

  wakeRecognition.onend = () => {
    if (isWakeActive) {
      try { wakeRecognition.start(); } catch (e) {}
    }
  };
}

// 4. Command Listener
function startCommandListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  if (wakeRecognition && isWakeActive) {
    try { wakeRecognition.stop(); } catch (e) {}
  }

  setJarvisVisualState("LISTENING");
  const box = document.getElementById("responseBox");
  if (box) box.innerText = "Listening to your command...";

  commandRecognition = new SpeechRecognition();
  commandRecognition.continuous = false;
  commandRecognition.interimResults = false;
  commandRecognition.lang = "en-IN";

  commandRecognition.onresult = async (event) => {
    const prompt = event.results[0][0].transcript;
    if (box) box.innerText = `"${prompt}"`;
    setJarvisVisualState("THINKING");

    // Check device actions first
    if (handleActionCommands(prompt)) {
      setJarvisVisualState("IDLE");
      return;
    }

    // Call Cloudflare Worker AI Engine
    try {
      const res = await fetch(WORKER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt })
      });
      const data = await res.json();
      const answer = data.reply || "Done, Boss.";
      displayAndSpeak(answer);
    } catch (err) {
      displayAndSpeak("Systems link timeout, Boss.");
    }

    setJarvisVisualState("IDLE");
    restartWakeIfActive();
  };

  commandRecognition.onerror = (e) => {
    console.warn("Recognition error:", e);
    setJarvisVisualState("IDLE");
    restartWakeIfActive();
  };

  try { commandRecognition.start(); } catch (e) {}
}

function restartWakeIfActive() {
  if (isWakeActive && wakeRecognition) {
    setTimeout(() => {
      try { wakeRecognition.start(); } catch (e) {}
    }, 500);
  }
}

// 5. High-Fidelity Speech Synthesizer
function speakVoice(text, callback) {
  if (!("speechSynthesis" in window)) {
    if (callback) callback();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN";
  utterance.rate = 1.05;
  utterance.pitch = 0.95;

  utterance.onend = () => {
    if (callback) callback();
  };
  utterance.onerror = () => {
    if (callback) callback();
  };

  window.speechSynthesis.speak(utterance);
}

// 6. Wake Mode Controller
function toggleWakeWord() {
  if (!wakeRecognition) initWakeWordEngine();

  const btn = document.getElementById("wakeToggleBtn");
  const txt = document.getElementById("wakeBtnText");
  const box = document.getElementById("responseBox");

  if (!isWakeActive) {
    try {
      wakeRecognition.start();
      isWakeActive = true;
      if (btn) btn.classList.add("active");
      if (txt) txt.innerText = "Wake Mode: ON";
      if (box) box.innerText = "Say 'Hey Jarvis'...";
    } catch (err) {}
  } else {
    isWakeActive = false;
    try { wakeRecognition.stop(); } catch (e) {}
    if (btn) btn.classList.remove("active");
    if (txt) txt.innerText = "Wake Mode: OFF";
    if (box) box.innerText = "Ready for command, Boss...";
    setJarvisVisualState("IDLE");
  }
}

function triggerManualListening() {
  startCommandListening();
}

// Service Worker Cache Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

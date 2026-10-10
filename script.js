// =========================================================================
// J.A.R.V.I.S. ZERO-LAG CLIENT ENGINE
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;

// Pre-warm Speech Synthesis on initial interaction
window.addEventListener("touchstart", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }
}, { once: true });

function setJarvisVisualState(state) {
  const orb = document.querySelector(".orb-inner");
  const ring = document.querySelector(".orb-ring");
  if (!orb) return;

  if (state === "IDLE") {
    orb.style.backgroundColor = "#00ffff";
    orb.style.boxShadow = "0 0 25px #00ffff";
    if (ring) ring.style.borderColor = "#00ffff";
  } else if (state === "LISTENING") {
    orb.style.backgroundColor = "#00ff77";
    orb.style.boxShadow = "0 0 35px #00ff77";
    if (ring) ring.style.borderColor = "#00ff77";
  } else if (state === "THINKING") {
    orb.style.backgroundColor = "#ff9900";
    orb.style.boxShadow = "0 0 40px #ff9900";
    if (ring) ring.style.borderColor = "#ff9900";
  }
}

// Zero-Latency Local Action Interceptor (< 50ms)
function interceptLocalAction(rawPrompt) {
  const p = rawPrompt.toLowerCase().trim();

  if (p.includes("youtube") || p.includes("play song") || p.includes("song play")) {
    let query = "";
    if (p.includes("play")) {
      query = p.replace(/.*play/, "").replace("on youtube", "").replace("in youtube", "").trim();
    } else if (p.includes("search")) {
      query = p.replace(/.*search/, "").replace("on youtube", "").trim();
    }

    const text = query ? `Opening YouTube for ${query}` : "Opening YouTube";
    speakVoiceQuick(text);
    const dest = query 
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` 
      : "https://www.youtube.com";
    setTimeout(() => { window.location.href = dest; }, 600);
    return true;
  }

  if (p.includes("search google") || p.includes("google search") || p.startsWith("google ")) {
    const q = p.replace("search google for", "").replace("google search", "").replace("google", "").trim();
    speakVoiceQuick(`Searching Google for ${q}`);
    setTimeout(() => {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    }, 600);
    return true;
  }

  return false;
}

// "Hey Jarvis" Wake Detector
function initWakeWordEngine() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = false;
  wakeRecognition.lang = "en-IN";

  wakeRecognition.onresult = (event) => {
    const text = event.results[event.resultIndex][0].transcript.trim().toLowerCase();
    if (text.includes("hey jarvis") || text.includes("jarvis") || text.includes("hai jarvis")) {
      speakVoiceQuick("Yes Boss?");
      startCommandListening();
    }
  };

  wakeRecognition.onend = () => {
    if (isWakeActive) {
      try { wakeRecognition.start(); } catch (e) {}
    }
  };
}

// Rapid Command Listener
function startCommandListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  if (wakeRecognition && isWakeActive) {
    try { wakeRecognition.stop(); } catch (e) {}
  }

  setJarvisVisualState("LISTENING");
  const box = document.getElementById("responseBox");
  if (box) box.innerText = "Listening...";

  commandRecognition = new SpeechRecognition();
  commandRecognition.continuous = false;
  commandRecognition.interimResults = false;
  commandRecognition.lang = "en-IN";

  commandRecognition.onresult = async (event) => {
    const prompt = event.results[0][0].transcript;
    if (box) box.innerText = `"${prompt}"`;

    // Local command bypass
    if (interceptLocalAction(prompt)) {
      setJarvisVisualState("IDLE");
      return;
    }

    setJarvisVisualState("THINKING");

    // Fast Fetch
    try {
      const res = await fetch(WORKER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      const answer = data.reply || "Done, Boss.";
      if (box) box.innerText = answer;
      speakVoiceQuick(answer);
    } catch (err) {
      if (box) box.innerText = "Connection lost.";
    }

    setJarvisVisualState("IDLE");
    resumeWake();
  };

  commandRecognition.onerror = () => {
    setJarvisVisualState("IDLE");
    resumeWake();
  };

  try { commandRecognition.start(); } catch (e) {}
}

function resumeWake() {
  if (isWakeActive && wakeRecognition) {
    setTimeout(() => {
      try { wakeRecognition.start(); } catch (e) {}
    }, 400);
  }
}

// Fast Speech Synthesizer (Higher rate for quicker audio output)
function speakVoiceQuick(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN";
  utterance.rate = 1.15; // 15% faster speech output
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

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
    if (box) box.innerText = "Ready, Boss.";
    setJarvisVisualState("IDLE");
  }
}

function triggerManualListening() {
  startCommandListening();
}

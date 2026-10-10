// =========================================================================
// J.A.R.V.I.S. ZERO-LATENCY PHONETIC INTENT & SPEECH ENGINE
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;

// Audio pre-warming to bypass browser autoplay policies
window.addEventListener("touchstart", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }
}, { once: true });

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
    if (glow) glow.style.background = "radial-gradient(circle, rgba(255,153,0,0.5) 0%, rgba(255,153,0) 70%)";
  }
}

// Low-latency local action router (<20ms execution)
function interceptLocalAction(rawPrompt) {
  const p = rawPrompt.toLowerCase().trim();

  // 1. Phonetic Navigation & Maps Interceptor
  if (
    p.includes("navigate") || 
    p.includes("nivgate") || 
    p.includes("navgate") || 
    p.includes("direction") || 
    p.includes("route to") || 
    p.includes("map to") ||
    (p.includes("map") && p.includes("to"))
  ) {
    let dest = p
      .replace(/.*(?:navigate to|nivgate to|navgate to|route to|map to|directions to|go to)/, "")
      .replace("play", "")
      .replace("please", "")
      .trim();

    if (!dest) dest = "Mancherial";

    const box = document.getElementById("responseBox");
    if (box) box.innerText = `Plotting route to ${dest}...`;
    speakVoiceQuick(`Plotting route to ${dest}, Boss.`);
    openFloatingMap(dest);
    return true;
  }

  // 2. YouTube Action Interceptor
  if (p.includes("youtube") || p.includes("play song") || p.includes("song play")) {
    let query = "";
    if (p.includes("play")) {
      query = p.replace(/.*play/, "").replace("on youtube", "").replace("in youtube", "").trim();
    } else if (p.includes("search")) {
      query = p.replace(/.*search/, "").replace("on youtube", "").trim();
    }

    const text = query ? `Opening YouTube for ${query}` : "Opening YouTube";
    const box = document.getElementById("responseBox");
    if (box) box.innerText = text;
    speakVoiceQuick(text);

    const dest = query 
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` 
      : "https://www.youtube.com";
    setTimeout(() => { window.location.href = dest; }, 600);
    return true;
  }

  // 3. Google Search Interceptor
  if (p.includes("search google") || p.includes("google search") || p.startsWith("google ")) {
    const q = p.replace("search google for", "").replace("google search", "").replace("google", "").trim();
    const box = document.getElementById("responseBox");
    if (box) box.innerText = `Searching Google for ${q}`;
    speakVoiceQuick(`Searching Google for ${q}`);

    setTimeout(() => {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    }, 600);
    return true;
  }

  return false;
}

// In-App Floating Map HUD Controls
function openFloatingMap(destination) {
  const modal = document.getElementById("floatingMapModal");
  const frame = document.getElementById("mapFrame");
  const title = document.getElementById("mapTitle");

  if (title) title.innerText = `NAVIGATION HUD // ${destination.toUpperCase()}`;
  if (frame) {
    frame.src = `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  }
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeFloatingMap() {
  const modal = document.getElementById("floatingMapModal");
  const frame = document.getElementById("mapFrame");
  if (modal) modal.style.display = "none";
  if (frame) frame.src = "";
  setJarvisVisualState("IDLE");
}

// "Hey Jarvis" Wake Engine
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

// Command Capture Engine
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

    // Local action bypass
    if (interceptLocalAction(prompt)) {
      setJarvisVisualState("IDLE");
      return;
    }

    setJarvisVisualState("THINKING");

    // Route to Cloudflare Worker + Gemini AI
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

function speakVoiceQuick(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN";
  utterance.rate = 1.15;
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

// Service Worker Cache
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

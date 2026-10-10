// =========================================================================
// J.A.R.V.I.S. ULTRA-FAST INTENT & PHONETIC ACTION ENGINE
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;
let isCommandActive = false;

// Pre-warm browser audio synthesis
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

// Zero-Latency Local Action Interceptor (< 15ms Execution)
function interceptLocalAction(rawPrompt) {
  const p = rawPrompt.toLowerCase().trim();

  // 1. Instant Watch / Clock / Time Interceptor
  if (
    p.includes("watch") || 
    p.includes("time") || 
    p.includes("clock") || 
    p.includes("samayam") ||
    p.includes("time entha")
  ) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    const message = `The time is ${timeStr}, Boss.`;
    const box = document.getElementById("responseBox");
    if (box) box.innerText = message;
    speakVoiceQuick(message);
    return true;
  }

  // 2. Greedy Media & YouTube Interceptor (Handles Chiranjeevi, songs, play, etc.)
  const musicTriggers = [
    "play", "paly", "ply", "song", "songs", "music", "youtube", "video",
    "chiranjeevi", "prabhas", "bahubali", "pawan", "kalyan", "ntr", "mahesh", "allu arjun"
  ];

  const hasMusicIntent = musicTriggers.some(word => p.includes(word));

  if (hasMusicIntent) {
    // Strip common filler noise and question words cleanly
    let query = p
      .replace(/when\s+(i\s+have\s+to|do\s+i|should\s+i)/gi, "")
      .replace(/how\s+(to|do\s+i)/gi, "")
      .replace(/^(hey jarvis|jarvis|please|can you|could you|want to)/gi, "")
      .replace(/\b(play|paly|ply|start|listen to|watch|open)\b/gi, "")
      .replace(/\b(on youtube|in youtube|youtube)\b/gi, "")
      .trim();

    if (!query || query === "songs" || query === "song") {
      if (p.includes("chiranjeevi")) query = "Chiranjeevi songs";
      else if (p.includes("prabhas")) query = "Prabhas songs";
      else query = "Telugu hit songs";
    }

    const box = document.getElementById("responseBox");
    if (box) box.innerText = `Playing ${query} on YouTube...`;
    speakVoiceQuick(`Playing ${query} on YouTube, Boss.`);

    setTimeout(() => {
      window.location.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    }, 600);
    return true;
  }

  // 3. Navigation & Floating Maps Interceptor
  if (
    p.includes("navigate") || 
    p.includes("nivgate") || 
    p.includes("navgate") || 
    p.includes("direction") || 
    p.includes("route") || 
    p.includes("map")
  ) {
    let dest = p
      .replace(/.*(?:navigate to|nivgate to|navgate to|route to|map to|directions to|go to)/gi, "")
      .replace(/^(hey jarvis|jarvis)/gi, "")
      .trim();

    if (!dest) dest = "Mancherial";

    const box = document.getElementById("responseBox");
    if (box) box.innerText = `Plotting route to ${dest}...`;
    speakVoiceQuick(`Plotting route to ${dest}, Boss.`);
    openFloatingMap(dest);
    return true;
  }

  // 4. Google Search Interceptor
  if (p.includes("google") || p.includes("search")) {
    const q = p
      .replace(/.*(?:search google for|google search|search for|google)/gi, "")
      .trim();

    const box = document.getElementById("responseBox");
    if (box) box.innerText = `Searching Google for ${q}...`;
    speakVoiceQuick(`Searching Google for ${q}`);

    setTimeout(() => {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    }, 600);
    return true;
  }

  return false;
}

// Floating HUD Map Controls
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

// Hotword Wake Engine ("Hey Jarvis")
function initWakeWordEngine() {
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

  wakeRecognition.onerror = (e) => {
    if (e.error === "not-allowed") {
      const box = document.getElementById("responseBox");
      if (box) box.innerText = "Mic blocked. Allow microphone permissions in browser settings.";
    }
  };

  wakeRecognition.onend = () => {
    if (isWakeActive && !isCommandActive) {
      setTimeout(() => {
        try { wakeRecognition.start(); } catch (e) {}
      }, 300);
    }
  };
}

// User Command Listener
function startCommandListening() {
  if (!SpeechRecognition) return;

  isCommandActive = true;
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

    // Local action bypass (<15ms)
    if (interceptLocalAction(prompt)) {
      setJarvisVisualState("IDLE");
      isCommandActive = false;
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
      if (box) box.innerText = "Systems link timeout.";
    }

    setJarvisVisualState("IDLE");
    isCommandActive = false;
    resumeWakeEngine();
  };

  commandRecognition.onerror = (e) => {
    setJarvisVisualState("IDLE");
    isCommandActive = false;
    resumeWakeEngine();
  };

  commandRecognition.onend = () => {
    isCommandActive = false;
    resumeWakeEngine();
  };

  try { commandRecognition.start(); } catch (e) {}
}

function resumeWakeEngine() {
  if (isWakeActive && wakeRecognition) {
    setTimeout(() => {
      try { wakeRecognition.start(); } catch (e) {}
    }, 400);
  }
}

// Fast Speech Synthesizer (1.15x speed to eliminate audio lag)
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
    if (box) box.innerText = "Ready for command, Boss...";
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

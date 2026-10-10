// =========================================================================
// J.A.R.V.I.S. ZERO-LATENCY INTENT & DEVICE DISPATCH ENGINE (V5)
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;
let isCommandActive = false;

// Audio synthesis initialization
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

// 1. High-Priority Intent Matcher (<10ms)
function interceptLocalAction(rawPrompt) {
  const p = rawPrompt.toLowerCase().trim();

  // A. Time & Clock
  if (p.includes("time") || p.includes("watch") || p.includes("clock") || p.includes("samayam") || p.includes("entha")) {
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    const reply = `The time is ${timeStr}, Boss.`;
    document.getElementById("responseBox").innerText = reply;
    speakVoiceQuick(reply);
    return true;
  }

  // B. Media & YouTube Dispatch
  const isMedia = [
    "play", "paly", "ply", "song", "songs", "music", "youtube", "video",
    "chiranjeevi", "prabhas", "bahubali", "pawan", "kalyan", "rebel", "salaar", "og"
  ].some(term => p.includes(term));

  if (isMedia) {
    let cleanQuery = p
      .replace(/when\s+(i\s+have\s+to|do\s+i|should\s+i)/gi, "")
      .replace(/how\s+(to|do\s+i)/gi, "")
      .replace(/^(hey jarvis|jarvis|please|can you|could you|want to)/gi, "")
      .replace(/\b(play|paly|ply|start|listen to|watch|open)\b/gi, "")
      .replace(/\b(on youtube|in youtube|youtube)\b/gi, "")
      .trim();

    if (!cleanQuery || cleanQuery === "song" || cleanQuery === "songs") {
      if (p.includes("chiranjeevi")) cleanQuery = "Chiranjeevi hit songs";
      else if (p.includes("prabhas")) cleanQuery = "Prabhas hit songs";
      else cleanQuery = "Telugu latest hit songs";
    }

    const feedback = `Playing ${cleanQuery} on YouTube, Boss.`;
    document.getElementById("responseBox").innerText = feedback;
    speakVoiceQuick(feedback);

    setTimeout(() => {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
      // Window.open avoids PWA redirection locks on Android
      const opened = window.open(url, "_blank");
      if (!opened) {
        window.location.href = url;
      }
    }, 600);
    return true;
  }

  // C. Navigation & Maps
  if (p.includes("navigate") || p.includes("nivgate") || p.includes("navgate") || p.includes("route") || p.includes("direction") || p.includes("map")) {
    let dest = p.replace(/.*(?:navigate to|nivgate to|navgate to|route to|map to|go to)/gi, "").trim();
    if (!dest) dest = "Mancherial";

    const feedback = `Plotting route to ${dest}, Boss.`;
    document.getElementById("responseBox").innerText = feedback;
    speakVoiceQuick(feedback);
    openFloatingMap(dest);
    return true;
  }

  // D. Google Search
  if (p.includes("search") || p.includes("google")) {
    const q = p.replace(/.*(?:search google for|google search|search for|google)/gi, "").trim();
    const feedback = `Searching Google for ${q}, Boss.`;
    document.getElementById("responseBox").innerText = feedback;
    speakVoiceQuick(feedback);
    setTimeout(() => {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
    }, 600);
    return true;
  }

  return false;
}

// In-App Navigation HUD
function openFloatingMap(destination) {
  const modal = document.getElementById("floatingMapModal");
  const frame = document.getElementById("mapFrame");
  const title = document.getElementById("mapTitle");
  if (title) title.innerText = `NAVIGATION HUD // ${destination.toUpperCase()}`;
  if (frame) frame.src = `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  if (modal) modal.style.display = "flex";
}

function closeFloatingMap() {
  const modal = document.getElementById("floatingMapModal");
  const frame = document.getElementById("mapFrame");
  if (modal) modal.style.display = "none";
  if (frame) frame.src = "";
  setJarvisVisualState("IDLE");
}

// 2. Command Capture & Fallback Router
function startCommandListening() {
  if (!SpeechRecognition) {
    alert("SpeechRecognition unsupported. Use Chrome.");
    return;
  }

  isCommandActive = true;
  if (wakeRecognition && isWakeActive) {
    try { wakeRecognition.stop(); } catch (e) {}
  }

  setJarvisVisualState("LISTENING");
  const box = document.getElementById("responseBox");
  const debug = document.getElementById("debugBox");
  box.innerText = "Listening...";
  if (debug) debug.innerText = "Listening for audio...";

  commandRecognition = new SpeechRecognition();
  commandRecognition.continuous = false;
  commandRecognition.interimResults = false;
  commandRecognition.lang = "en-IN";

  commandRecognition.onresult = async (event) => {
    const prompt = event.results[0][0].transcript;
    if (debug) debug.innerText = `Transcript: "${prompt}"`;

    if (interceptLocalAction(prompt)) {
      setJarvisVisualState("IDLE");
      isCommandActive = false;
      return;
    }

    setJarvisVisualState("THINKING");

    try {
      const res = await fetch(WORKER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      const reply = data.reply || "Done, Boss.";
      box.innerText = reply;
      speakVoiceQuick(reply);
    } catch (err) {
      box.innerText = "Systems link timeout.";
    }

    setJarvisVisualState("IDLE");
    isCommandActive = false;
    resumeWakeEngine();
  };

  commandRecognition.onerror = (e) => {
    if (debug) debug.innerText = `Error: ${e.error}`;
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

function speakVoiceQuick(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN";
  utterance.rate = 1.15;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

// 3. Hotword Engine
function initWakeWordEngine() {
  if (!SpeechRecognition) return;

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = false;
  wakeRecognition.lang = "en-IN";

  wakeRecognition.onresult = (event) => {
    const text = event.results[event.resultIndex][0].transcript.trim().toLowerCase();
    const debug = document.getElementById("debugBox");
    if (debug) debug.innerText = `Wake Audio: "${text}"`;

    if (text.includes("hey jarvis") || text.includes("jarvis") || text.includes("hai jarvis")) {
      speakVoiceQuick("Yes Boss?");
      startCommandListening();
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
      box.innerText = "Wake Mode active. Say 'Hey Jarvis'...";
    } catch (err) {}
  } else {
    isWakeActive = false;
    try { wakeRecognition.stop(); } catch (e) {}
    if (btn) btn.classList.remove("active");
    if (txt) txt.innerText = "Wake Mode: OFF";
    box.innerText = "Ready, Boss.";
    setJarvisVisualState("IDLE");
  }
}

function triggerManualListening() {
  startCommandListening();
}

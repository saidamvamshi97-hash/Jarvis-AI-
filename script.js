// =========================================================================
// J.A.RV.I.S. MULTILINGUAL (TELUGU / HINDI / TAMIL / ENGLISH) CORE ENGINE
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;
let isCommandActive = false;

// Pre-warm browser audio synthesis on touch
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

function updateUI(mainText, debugText) {
  const box = document.getElementById("responseBox");
  const debug = document.getElementById("debugBox");
  if (box) box.innerText = mainText;
  if (debug && debugText) debug.innerText = debugText;
}

// 1. Multilingual Zero-Latency Local Action Interceptor
function interceptLocalAction(rawPrompt) {
  const p = rawPrompt.toLowerCase().trim();

  // A. Time / Watch / Clock in English, Telugu, Hindi, Tamil
  // "samayam", "time entha", "kiti vaje", "neram", "kalam", "watch", "ghadi"
  const timeKeywords = [
    "time", "watch", "clock", "samayam", "time entha", "samayam entha", 
    "kya time", "samay", "neram", "kiti vaje", "ghadi", "mani enna"
  ];

  if (timeKeywords.some(w => p.includes(w))) {
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    const reply = `The time is ${timeStr}, Boss.`;
    updateUI(reply, "Action: Live Time Triggered");
    speakVoiceQuick(reply);
    return true;
  }

  // B. Multilingual Music & Video Interceptor
  // Supports: play, paly, ply, paata, paatalu, gaana, geet, paatu, paadal, video, music
  const musicTriggers = [
    "play", "paly", "ply", "ple", "song", "songs", "paata", "paatalu", "pata", "patalu",
    "gana", "gaana", "geet", "paatu", "padal", "paadal", "music", "youtube", "video",
    "chiranjeevi", "prabhas", "bahubali", "pawan", "kalyan", "rebel", "salaar", "og", "devara",
    "mahesh", "ntr", "allu arjun", "dsp", "thaman", "anirudh", "rajini", "kamal", "vijay"
  ];

  if (musicTriggers.some(w => p.includes(w))) {
    // Clean regional verbs, command prefixes, and question wrappers
    let cleanQuery = p
      .replace(/when\s+(i\s+have\s+to|do\s+i|should\s+i)/gi, "")
      .replace(/how\s+(to|do\s+i)/gi, "")
      .replace(/^(hey jarvis|jarvis|please|bhayya|mama|bro|can you)/gi, "")
      .replace(/\b(play|paly|ply|start|listen to|watch|open|choodu|vinu|pettu|lagao|chalao|podu)\b/gi, "")
      .replace(/\b(on youtube|in youtube|youtube|lo|la)\b/gi, "")
      .trim();

    // Default fallbacks if user only said "play songs" or regional equivalents
    if (!cleanQuery || ["song", "songs", "paata", "paatalu", "gaana", "paatu"].includes(cleanQuery)) {
      if (p.includes("chiranjeevi")) cleanQuery = "Chiranjeevi hit songs";
      else if (p.includes("prabhas")) cleanQuery = "Prabhas hit songs";
      else cleanQuery = "Telugu latest hit songs";
    }

    const reply = `Streaming ${cleanQuery} in Floating HUD, Boss.`;
    updateUI(reply, `Dispatched HUD: "${cleanQuery}"`);
    speakVoiceQuick(reply);
    openFloatingMusic(cleanQuery);
    return true;
  }

  // C. Multilingual Navigation & Maps (Route, Margam, Raasta, Vazhi)
  const navTriggers = ["navigate", "nivgate", "navgate", "route", "direction", "map", "raasta", "margam", "vazhi", "vellu"];
  if (navTriggers.some(w => p.includes(w))) {
    let dest = p
      .replace(/.*(?:navigate to|nivgate to|navgate to|route to|map to|go to|vellu|jaana)/gi, "")
      .replace(/^(hey jarvis|jarvis)/gi, "")
      .trim();

    if (!dest) dest = "Mancherial";

    const reply = `Plotting route to ${dest}, Boss.`;
    updateUI(reply, `Dispatched Navigation: "${dest}"`);
    speakVoiceQuick(reply);
    openFloatingMap(dest);
    return true;
  }

  return false;
}

// In-App Floating Music HUD
function openFloatingMusic(query) {
  const modal = document.getElementById("floatingMusicModal");
  const frame = document.getElementById("musicFrame");
  const title = document.getElementById("musicTitle");

  if (title) title.innerText = `AUDIO STREAM // ${query.toUpperCase()}`;
  if (frame) {
    frame.src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`;
  }
  if (modal) modal.style.display = "flex";
}

function closeFloatingMusic() {
  const modal = document.getElementById("floatingMusicModal");
  const frame = document.getElementById("musicFrame");
  if (modal) modal.style.display = "none";
  if (frame) frame.src = "";
  setJarvisVisualState("IDLE");
}

// In-App Floating Navigation HUD
function openFloatingMap(destination) {
  const modal = document.getElementById("floatingMapModal");
  const frame = document.getElementById("mapFrame");
  const title = document.getElementById("mapTitle");

  if (title) title.innerText = `NAVIGATION HUD // ${destination.toUpperCase()}`;
  if (frame) {
    frame.src = `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  }
  if (modal) modal.style.display = "flex";
}

function closeFloatingMap() {
  const modal = document.getElementById("floatingMapModal");
  const frame = document.getElementById("mapFrame");
  if (modal) modal.style.display = "none";
  if (frame) frame.src = "";
  setJarvisVisualState("IDLE");
}

// 2. Active Command Listener with Multilingual Accent Support
function startCommandListening() {
  if (!SpeechRecognition) {
    alert("SpeechRecognition unsupported. Please use Chrome.");
    return;
  }

  isCommandActive = true;
  if (wakeRecognition && isWakeActive) {
    try { wakeRecognition.stop(); } catch (e) {}
  }

  setJarvisVisualState("LISTENING");
  updateUI("Listening...", "Mic active. Speak in Telugu, Hindi, Tamil, or English...");

  commandRecognition = new SpeechRecognition();
  commandRecognition.continuous = false;
  commandRecognition.interimResults = false;
  
  // en-IN allows English mixed with Indian transliterations (Tanglish, Hinglish)
  commandRecognition.lang = "en-IN";

  commandRecognition.onresult = async (event) => {
    const prompt = event.results[0][0].transcript;
    updateUI(`"${prompt}"`, `Heard: "${prompt}"`);

    // 1. Check local zero-latency actions
    if (interceptLocalAction(prompt)) {
      setJarvisVisualState("IDLE");
      isCommandActive = false;
      return;
    }

    // 2. Send to Cloudflare Worker for AI response
    setJarvisVisualState("THINKING");

    try {
      const res = await fetch(WORKER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      const reply = data.reply || "Done, Boss.";
      updateUI(reply, "Cloudflare Gemini Answered");
      speakVoiceQuick(reply);
    } catch (err) {
      updateUI("Systems link timeout, Boss.", `Error: ${err.message}`);
    }

    setJarvisVisualState("IDLE");
    isCommandActive = false;
    resumeWakeEngine();
  };

  commandRecognition.onerror = (e) => {
    updateUI("Listening interrupted.", `Mic Status: ${e.error}`);
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

// Speech Synthesizer: Detects Telugu/Hindi scripts vs English automatically
function speakVoiceQuick(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set language voice based on character set
  if (/[\u0C00-\u0C7F]/.test(text)) {
    utterance.lang = "te-IN"; // Telugu script detected
  } else if (/[\u0900-\u097F]/.test(text)) {
    utterance.lang = "hi-IN"; // Hindi/Devanagari script detected
  } else if (/[\u0B80-\u0BFF]/.test(text)) {
    utterance.lang = "ta-IN"; // Tamil script detected
  } else {
    utterance.lang = "en-IN"; // Default Indian English
  }

  utterance.rate = 1.15;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

// 3. Continuous Wake Word Engine ("Hey Jarvis")
function initWakeWordEngine() {
  if (!SpeechRecognition) return;

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = false;
  wakeRecognition.lang = "en-IN";

  wakeRecognition.onresult = (event) => {
    const text = event.results[event.resultIndex][0].transcript.trim().toLowerCase();
    updateUI("Ready for command, Boss.", `Wake Audio: "${text}"`);

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

  if (!isWakeActive) {
    try {
      wakeRecognition.start();
      isWakeActive = true;
      if (btn) btn.classList.add("active");
      if (txt) txt.innerText = "Wake Mode: ON";
      updateUI("Wake Mode Active", "Listening for 'Hey Jarvis'...");
    } catch (err) {}
  } else {
    isWakeActive = false;
    try { wakeRecognition.stop(); } catch (e) {}
    if (btn) btn.classList.remove("active");
    if (txt) txt.innerText = "Wake Mode: OFF";
    updateUI("Ready for command, Boss.", "Wake Mode Off.");
    setJarvisVisualState("IDLE");
  }
}

function triggerManualListening() {
  startCommandListening();
}

// =========================================================================
// J.A.R.V.I.S. SMART ACTION & SPEECH ENGINE (EPISODE 09/10 UPGRADE)
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;

function setJarvisVisualState(state) {
  const orb = document.querySelector(".orb-inner");
  const ring = document.querySelector(".orb-ring");
  if (!orb) return;

  if (state === "IDLE") {
    orb.style.backgroundColor = "#00ffff";
    orb.style.boxShadow = "0 0 25px #00ffff";
    if (ring) ring.style.borderColor = "#00ffff";
  } else if (state === "LISTENING") {
    orb.style.backgroundColor = "#00ff00";
    orb.style.boxShadow = "0 0 35px #00ff00";
    if (ring) ring.style.borderColor = "#00ff00";
  } else if (state === "THINKING") {
    orb.style.backgroundColor = "#ffa500";
    orb.style.boxShadow = "0 0 35px #ffa500";
    if (ring) ring.style.borderColor = "#ffa500";
  }
}

// 1. Action Intent Engine (YouTube, Google, Media)
function executeDeviceAction(prompt) {
  const p = prompt.toLowerCase();

  // YouTube Triggers
  if (p.includes("open youtube") || p.includes("youtube open") || p.includes("play song") || p.includes("youtube")) {
    let query = "";
    if (p.includes("play")) {
      query = p.replace(/.*play/, "").replace("on youtube", "").trim();
    }
    
    document.getElementById("responseBox").innerText = "Opening YouTube, Boss...";
    speakVoiceFeedback("Opening YouTube now, Boss");
    
    setTimeout(() => {
      if (query) {
        window.location.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      } else {
        window.location.href = "https://www.youtube.com";
      }
    }, 1200);
    return true;
  }

  // Google Search Triggers
  if (p.includes("search google") || p.includes("google search")) {
    const q = p.replace("search google for", "").replace("search google", "").trim();
    document.getElementById("responseBox").innerText = "Searching Google...";
    speakVoiceFeedback("Searching Google for you, Boss");
    setTimeout(() => {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    }, 1200);
    return true;
  }

  return false;
}

// 2. Wake Word Engine ("Hey Jarvis")
function initWakeWordEngine() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = false;
  wakeRecognition.lang = "en-IN"; // Set to Indian accent for better accuracy

  wakeRecognition.onresult = (event) => {
    const current = event.resultIndex;
    const text = event.results[current][0].transcript.trim().toLowerCase();
    console.log("Wake word hearing:", text);

    if (text.includes("hey jarvis") || text.includes("jarvis") || text.includes("hai jarvis")) {
      document.getElementById("responseBox").innerText = "Listening to you, Boss...";
      speakVoiceFeedback("Yes Boss?");
      startCommandListening();
    }
  };

  wakeRecognition.onend = () => {
    if (isWakeActive) {
      try { wakeRecognition.start(); } catch(e){}
    }
  };
}

// 3. User Voice Command Listener
function startCommandListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  if (wakeRecognition && isWakeActive) {
    try { wakeRecognition.stop(); } catch(e){}
  }

  setJarvisVisualState("LISTENING");
  commandRecognition = new SpeechRecognition();
  commandRecognition.continuous = false;
  commandRecognition.interimResults = false;
  commandRecognition.lang = "en-IN"; // Optimized for regional diction

  commandRecognition.onresult = async (event) => {
    const prompt = event.results[0][0].transcript;
    document.getElementById("responseBox").innerText = `"${prompt}"`;
    setJarvisVisualState("THINKING");

    // First check: Is it an Action Command like "Open YouTube"?
    const isAction = executeDeviceAction(prompt);
    if (isAction) {
      setJarvisVisualState("IDLE");
      return;
    }

    // Otherwise: Send to Cloudflare Worker Gemini AI
    try {
      const res = await fetch(WORKER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt })
      });
      const data = await res.json();
      const reply = data.reply || "Done, Boss.";
      document.getElementById("responseBox").innerText = reply;
      speakVoiceFeedback(reply);
    } catch (e) {
      document.getElementById("responseBox").innerText = "Systems link timeout.";
    }

    setJarvisVisualState("IDLE");
    if (isWakeActive && wakeRecognition) {
      try { wakeRecognition.start(); } catch(e){}
    }
  };

  commandRecognition.onerror = (e) => {
    console.error("Speech error:", e);
    setJarvisVisualState("IDLE");
    if (isWakeActive && wakeRecognition) {
      try { wakeRecognition.start(); } catch(e){}
    }
  };

  try { commandRecognition.start(); } catch(e){}
}

function triggerManualListening() {
  startCommandListening();
}

function speakVoiceFeedback(text) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  }
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
      document.getElementById("responseBox").innerText = "Say 'Hey Jarvis'...";
    } catch (err) {}
  } else {
    isWakeActive = false;
    try { wakeRecognition.stop(); } catch(e){}
    if (btn) btn.classList.remove("active");
    if (txt) txt.innerText = "Wake Mode: OFF";
    document.getElementById("responseBox").innerText = "Ready for command, Boss...";
    setJarvisVisualState("IDLE");
  }
}

// =========================================================================
// EPISODE 09: CORE ORB STATES + "HEY JARVIS" SPEECH ENGINE
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;

// 1. Visual Orb State Controller
function setJarvisVisualState(state) {
  const orb = document.querySelector(".orb-inner");
  const ring = document.querySelector(".orb-ring");
  if (!orb) return;

  switch (state) {
    case "IDLE":
      orb.style.backgroundColor = "#00ffff";
      orb.style.boxShadow = "0 0 25px #00ffff";
      if (ring) ring.style.borderColor = "#00ffff";
      break;
    case "LISTENING":
      orb.style.backgroundColor = "#00ff00";
      orb.style.boxShadow = "0 0 30px #00ff00";
      if (ring) ring.style.borderColor = "#00ff00";
      break;
    case "THINKING":
      orb.style.backgroundColor = "#ffa500";
      orb.style.boxShadow = "0 0 35px #ffa500";
      if (ring) ring.style.borderColor = "#ffa500";
      break;
  }
}

// 2. Continuous Hotword Detector ("Hey Jarvis")
function initWakeWordEngine() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = false;
  wakeRecognition.lang = "en-US";

  wakeRecognition.onresult = (event) => {
    const current = event.resultIndex;
    const transcript = event.results[current][0].transcript.trim().toLowerCase();

    if (transcript.includes("hey jarvis") || transcript.includes("jarvis")) {
      document.getElementById("responseBox").innerText = "Listening to you, Boss...";
      speakVoiceFeedback("Yes Boss?");
      startCommandListening();
    }
  };

  wakeRecognition.onend = () => {
    if (isWakeActive) wakeRecognition.start();
  };
}

// 3. User Command Listener
function startCommandListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  if (wakeRecognition && isWakeActive) {
    wakeRecognition.stop();
  }

  setJarvisVisualState("LISTENING");
  commandRecognition = new SpeechRecognition();
  commandRecognition.continuous = false;
  commandRecognition.interimResults = false;
  commandRecognition.lang = "en-US";

  commandRecognition.onresult = async (event) => {
    const prompt = event.results[0][0].transcript;
    document.getElementById("responseBox").innerText = `"${prompt}"`;
    setJarvisVisualState("THINKING");

    // Call Cloudflare Worker
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
      wakeRecognition.start();
    }
  };

  commandRecognition.onerror = () => {
    setJarvisVisualState("IDLE");
    if (isWakeActive && wakeRecognition) wakeRecognition.start();
  };

  commandRecognition.start();
}

function triggerManualListening() {
  startCommandListening();
}

function speakVoiceFeedback(text) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
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
    wakeRecognition.stop();
    if (btn) btn.classList.remove("active");
    if (txt) txt.innerText = "Wake Mode: OFF";
    document.getElementById("responseBox").innerText = "Ready for command, Boss...";
    setJarvisVisualState("IDLE");
  }
}

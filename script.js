// =========================================================================
// J.A.R.V.I.S. MULTILINGUAL RUNTIME + MULTI-TASK & FAILOVER ENGINE
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;
let isCommandActive = false;

// Audio synthesis warmup
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

// -------------------------------------------------------------------------
// UNIVERSAL FLOATING HUD ENGINE
// -------------------------------------------------------------------------
function openUniversalApp(appName, embedUrl, deepLinkUrl) {
  const modal = document.getElementById("universalAppModal");
  const frame = document.getElementById("appHudFrame");
  const title = document.getElementById("appHudTitle");
  const pip = document.getElementById("appPipLink");

  if (title) title.innerText = `${appName.toUpperCase()} // ACTIVE`;
  
  if (pip && deepLinkUrl) {
    pip.href = deepLinkUrl;
    pip.style.display = "inline";
    pip.innerText = `[OPEN APP]`;
  } else if (pip) {
    pip.style.display = "none";
  }

  if (frame) {
    frame.src = embedUrl;
  }
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeUniversalApp() {
  const modal = document.getElementById("universalAppModal");
  const frame = document.getElementById("appHudFrame");
  if (modal) modal.style.display = "none";
  if (frame) frame.src = "";
  setJarvisVisualState("IDLE");
}

// -------------------------------------------------------------------------
// MULTI-INTENT SEQUENTIAL COMMAND RUNNER
// -------------------------------------------------------------------------
function splitMultiCommands(prompt) {
  const delimiterRegex = /\b(and then|and also|then|and|mariyu|inka|aur|phir)\b|,/gi;
  return prompt
    .split(delimiterRegex)
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 2 && !cmd.match(/^(and|then|also|mariyu|inka|aur|phir)$/i));
}

function executeSingleAction(p) {
  // 1. Time / Watch (Telugu, Hindi, Tamil, English)
  const timeTriggers = ["time", "watch", "clock", "samayam", "time entha", "samay", "neram", "ghadi"];
  if (timeTriggers.some(w => p.includes(w))) {
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    const reply = `The time is ${timeStr}, Boss.`;
    speakVoiceQuick(reply);
    updateUI(reply, "Action: Live Time Triggered");
    return true;
  }

  // 2. Weather Radar HUD
  if (p.includes("weather") || p.includes("rain") || p.includes("climate") || p.includes("varsham") || p.includes("mausam")) {
    const reply = "Loading atmospheric weather radar, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Weather Radar");
    openUniversalApp(
      "Weather Radar",
      "https://embed.windy.com/embed2.html?lat=16.36&lon=78.06&detailLat=16.36&detailLon=78.06&width=400&height=250&zoom=7&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1",
      "https://www.windy.com"
    );
    return true;
  }

  // 3. Cricket Scorecard HUD
  if (p.includes("cricket") || p.includes("score") || p.includes("ipl") || p.includes("match")) {
    const reply = "Streaming live cricket scorecard in HUD, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Cricket Scores");
    openUniversalApp("Live Cricket", "https://m.cricbuzz.com/cricket-match/live-scores", "https://www.cricbuzz.com");
    return true;
  }

  // 4. Calculator HUD
  if (p.includes("calculator") || p.includes("calculate") || p.includes("lekkalu") || p.includes("hisab")) {
    const reply = "Opening calculation core, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Calculator");
    openUniversalApp("Calculator", "https://www.desmos.com/scientific", "https://www.desmos.com/scientific");
    return true;
  }

  // 5. Wikipedia Topic Intel
  if (p.startsWith("wiki") || p.startsWith("who is") || p.startsWith("what is")) {
    const topic = p.replace(/^(wiki|who is|what is|tell me about)/gi, "").trim();
    if (topic.length > 2) {
      const reply = `Retrieving intelligence on ${topic}, Boss.`;
      speakVoiceQuick(reply);
      updateUI(reply, `Dispatched: Wikipedia -> ${topic}`);
      openUniversalApp(
        `WIKI // ${topic}`,
        `https://en.m.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
        `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`
      );
      return true;
    }
  }

  // 6. Music & Video Dispatcher (Native YouTube Intent or Spotify HUD)
  const musicTriggers = [
    "play", "paly", "ply", "song", "songs", "paata", "paatalu", "music", "youtube", "spotify",
    "chiranjeevi", "prabhas", "pawan", "kalyan", "rebel", "salaar", "dsp", "anirudh"
  ];
  if (musicTriggers.some(w => p.includes(w))) {
    let cleanQuery = p
      .replace(/when\s+(i\s+have\s+to|do\s+i|should\s+i)/gi, "")
      .replace(/how\s+(to|do\s+i)/gi, "")
      .replace(/^(hey jarvis|jarvis|please|bhayya|mama|bro|can you)/gi, "")
      .replace(/\b(play|paly|ply|start|listen to|watch|open|choodu|vinu|pettu|lagao|chalao)\b/gi, "")
      .replace(/\b(on youtube|in youtube|youtube|on spotify|spotify|lo|la)\b/gi, "")
      .trim();

    if (!cleanQuery || ["song", "songs", "paata", "paatalu"].includes(cleanQuery)) {
      if (p.includes("chiranjeevi")) cleanQuery = "Chiranjeevi hit songs";
      else if (p.includes("prabhas")) cleanQuery = "Prabhas hit songs";
      else cleanQuery = "Telugu latest hit songs";
    }

    if (p.includes("spotify")) {
      const reply = `Streaming ${cleanQuery} on Spotify HUD, Boss.`;
      speakVoiceQuick(reply);
      updateUI(reply, `Dispatched: Spotify -> "${cleanQuery}"`);
      openUniversalApp(
        `Spotify // ${cleanQuery}`,
        `https://open.spotify.com/embed/search/${encodeURIComponent(cleanQuery)}`,
        `spotify:search:${encodeURIComponent(cleanQuery)}`
      );
    } else {
      const reply = `Playing ${cleanQuery} on YouTube, Boss.`;
      speakVoiceQuick(reply);
      updateUI(reply, `Launching YouTube: "${cleanQuery}"`);
      setTimeout(() => {
        const intent = `intent://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}#Intent;scheme=https;package=com.google.android.youtube;end`;
        const fallback = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
        const opened = window.open(intent, "_blank");
        if (!opened) window.location.href = fallback;
      }, 600);
    }
    return true;
  }

  // 7. Navigation & Maps
  const navTriggers = ["navigate", "route", "direction", "map", "raasta", "margam", "vellu"];
  if (navTriggers.some(w => p.includes(w))) {
    let dest = p.replace(/.*(?:navigate to|route to|map to|go to|vellu)/gi, "").replace(/^(hey jarvis|jarvis)/gi, "").trim();
    if (!dest) dest = "Wanaparthy";

    const reply = `Plotting route to ${dest}, Boss.`;
    speakVoiceQuick(reply);
    updateUI(reply, `Dispatched Navigation: "${dest}"`);
    openUniversalApp(`Route: ${dest}`, `https://maps.google.com/maps?q=${encodeURIComponent(dest)}&t=&z=13&ie=UTF8&iwloc=&output=embed`, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`);
    return true;
  }

  return false;
}

async function interceptLocalAction(rawPrompt) {
  const commands = splitMultiCommands(rawPrompt);

  if (commands.length <= 1) {
    return executeSingleAction(rawPrompt.toLowerCase());
  }

  updateUI(`Executing ${commands.length} tasks...`, `Chained Intent: ${commands.join(" -> ")}`);
  let executedAny = false;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i].toLowerCase();
    const handled = executeSingleAction(cmd);
    if (handled) executedAny = true;
    if (i < commands.length - 1) {
      await new Promise(res => setTimeout(res, 1200));
    }
  }

  return executedAny;
}

// -------------------------------------------------------------------------
// SPEECH RECOGNITION & BACKEND ROUTER
// -------------------------------------------------------------------------
function startCommandListening() {
  if (!SpeechRecognition) {
    alert("SpeechRecognition unsupported. Please open in Google Chrome.");
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
  commandRecognition.lang = "en-IN";

  commandRecognition.onresult = async (event) => {
    const prompt = event.results[0][0].transcript;
    updateUI(`"${prompt}"`, `Heard: "${prompt}"`);

    // 1. Intercept fast local actions & multi-tasks
    const wasHandled = await interceptLocalAction(prompt);
    if (wasHandled) {
      setJarvisVisualState("IDLE");
      isCommandActive = false;
      return;
    }

    // 2. Query Cloudflare Backend
    setJarvisVisualState("THINKING");

    try {
      const res = await fetch(WORKER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      const reply = data.reply || "Done, Boss.";
      updateUI(reply, "Cloud AI Answered");
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

// Multilingual Speech Synthesizer
function speakVoiceQuick(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  if (/[\u0C00-\u0C7F]/.test(text)) {
    utterance.lang = "te-IN";
  } else if (/[\u0900-\u097F]/.test(text)) {
    utterance.lang = "hi-IN";
  } else if (/[\u0B80-\u0BFF]/.test(text)) {
    utterance.lang = "ta-IN";
  } else {
    utterance.lang = "en-IN";
  }

  utterance.rate = 1.15;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

// -------------------------------------------------------------------------
// CONTINUOUS WAKE WORD ENGINE ("Hey Jarvis")
// -------------------------------------------------------------------------
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

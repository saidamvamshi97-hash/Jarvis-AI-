// =========================================================================
// J.A.R.V.I.S. MK-VIII: HIGHWAY COPILOT (>60 KM/H SPEED TRIGGER + AMENITIES)
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;
let isCommandActive = false;

// Multi-turn conversational memory cache
let conversationMemory = [];

// 5-Second Silence Detection
let speechCaptureTimer = null;
let collectedTranscript = "";

let audioCtx = null;
let availableVoices = [];

// Live GPS Speed & Location State
let currentLat = 17.3850;
let currentLon = 78.4867;
let currentSpeedKmh = 0;
let hasTriggeredHighSpeedAlert = false;

// -------------------------------------------------------------------------
// AUDIO ENGINE & VOICE INITIALIZATION
// -------------------------------------------------------------------------
function initAudioEngine() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}
window.addEventListener("touchstart", initAudioEngine, { once: true });
window.addEventListener("click", initAudioEngine, { once: true });

function loadSystemVoices() {
  if ("speechSynthesis" in window) {
    availableVoices = window.speechSynthesis.getVoices();
  }
}

if ("speechSynthesis" in window) {
  loadSystemVoices();
  window.speechSynthesis.onvoiceschanged = loadSystemVoices;
}

function selectRoboticMaleVoice(langCode) {
  if (!availableVoices.length) loadSystemVoices();

  const maleKeywords = ["male", "guy", "david", "george", "oliver", "rishi", "google uk english male"];
  const langVoices = availableVoices.filter(v => v.lang.toLowerCase().startsWith(langCode.slice(0, 2)));

  const maleMatch = langVoices.find(v => 
    maleKeywords.some(kw => v.name.toLowerCase().includes(kw))
  );
  if (maleMatch) return maleMatch;

  const globalMale = availableVoices.find(v => 
    (v.lang.includes("en-GB") || v.lang.includes("en-US") || v.lang.includes("en-IN")) &&
    maleKeywords.some(kw => v.name.toLowerCase().includes(kw))
  );
  if (globalMale) return globalMale;

  return langVoices[0] || availableVoices[0] || null;
}

function speakVoiceQuick(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  let targetLang = "en-GB"; 
  if (/[\u0C00-\u0C7F]/.test(text)) targetLang = "te-IN";
  else if (/[\u0900-\u097F]/.test(text)) targetLang = "hi-IN";
  else if (/[\u0B80-\u0BFF]/.test(text)) targetLang = "ta-IN";

  utterance.lang = targetLang;
  const maleVoice = selectRoboticMaleVoice(targetLang);
  if (maleVoice) utterance.voice = maleVoice;

  utterance.pitch = 0.78; 
  utterance.rate = 1.05;  
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}

// -------------------------------------------------------------------------
// LIVE GPS SPEEDOMETER & HIGHWAY AUTO-ACTIVATION (>60 KM/H)
// -------------------------------------------------------------------------
function initGpsSpeedometer() {
  if (!("geolocation" in navigator)) return;

  const options = {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 5000
  };

  navigator.geolocation.watchPosition(
    (pos) => {
      currentLat = pos.coords.latitude;
      currentLon = pos.coords.longitude;

      // Speed is provided in meters/second -> convert to km/h
      const speedMps = pos.coords.speed || 0;
      currentSpeedKmh = Math.round(speedMps * 3.6);

      const speedEl = document.getElementById("speedStat");
      const modeEl = document.getElementById("modeStat");

      if (speedEl) speedEl.innerText = `${currentSpeedKmh} KM/H`;

      // AUTONOMOUS HIGH-SPEED VEHICLE TRIGGER (> 60 KM/H)
      if (currentSpeedKmh >= 60) {
        if (modeEl) {
          modeEl.innerText = "HIGHWAY";
          modeEl.style.color = "#ff9900";
        }

        if (!hasTriggeredHighSpeedAlert) {
          hasTriggeredHighSpeedAlert = true;
          triggerHighwayCopilotActivation();
        }
      } else if (currentSpeedKmh < 45) {
        // Reset trigger once speed drops
        hasTriggeredHighSpeedAlert = false;
        if (modeEl) {
          modeEl.innerText = "CRUISE";
          modeEl.style.color = "#00ffff";
        }
      }
    },
    (err) => console.warn("GPS Speedometer:", err.message),
    options
  );
}

// Autonomous high-speed protocol activation
async function triggerHighwayCopilotActivation() {
  playFuturisticChime("WAKE");
  triggerHaptic("WAKE");

  const alertText = `Velocity exceeded 60 km/h, Boss. Highway Copilot active. Monitoring upcoming tolls, fuel stations, hospitals, and repair shops.`;
  speakVoiceQuick(alertText);
  updateUI(alertText, "Autonomous Mode: Highway Radar Engaged");

  // Send priority Telegram telemetry
  fetch(`${WORKER_ENDPOINT}/api/telegram/alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `🏎️ *High-Speed Highway Mode Activated*\nCurrent Speed: ${currentSpeedKmh} km/h\nCoordinates: \`${currentLat.toFixed(4)},${currentLon.toFixed(4)}\`\nAmenities radar active.`
    })
  }).catch(() => {});
}

// -------------------------------------------------------------------------
// HIGHWAY RADAR DISPATCHER (FUEL, TOLLS, HOSPITALS, REPAIR)
// -------------------------------------------------------------------------
async function scanHighwayAmenity(type) {
  let label = "Fuel Station";
  let mapsQuery = "petrol pump near me";

  if (type === "toll") {
    label = "Toll Plaza";
    mapsQuery = "toll plaza on my route";
  } else if (type === "hospital") {
    label = "Emergency Hospital";
    mapsQuery = "emergency hospital near me";
  } else if (type === "repair") {
    label = "Vehicle Mechanic & Tyre Repair";
    mapsQuery = "car bike puncture vehicle repair shop near me";
  }

  const announcing = `Scanning corridor for nearest ${label}, Boss.`;
  speakVoiceQuick(announcing);
  updateUI(announcing, `Radar: Locating ${label}...`);
  setJarvisVisualState("THINKING");

  // Embed live Google Maps radar inside the HUD modal
  openUniversalApp(
    `RADAR // ${label.toUpperCase()}`,
    `https://maps.google.com/maps?q=${encodeURIComponent(mapsQuery)}&t=&z=13&ie=UTF8&iwloc=&output=embed`,
    `https://www.google.com/maps/search/${encodeURIComponent(mapsQuery)}`
  );

  // Dispatch background telegram notification
  fetch(`${WORKER_ENDPOINT}/api/telegram/alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `📍 *Highway Amenity Inquiry: ${label}*\nSpeed: ${currentSpeedKmh} km/h\nRadar dispatched in HUD.`
    })
  }).catch(() => {});

  return true;
}

// -------------------------------------------------------------------------
// HUD MODAL CONTROLLER & TRIPLE-TAP FULLSCREEN
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

  if (frame) frame.src = embedUrl;
  if (modal) {
    modal.classList.remove("fullscreen-mode");
    modal.style.display = "flex";
  }
}

function closeUniversalApp() {
  const modal = document.getElementById("universalAppModal");
  const frame = document.getElementById("appHudFrame");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("fullscreen-mode");
  }
  if (frame) frame.src = "";
  setJarvisVisualState("IDLE");
}

let tapCount = 0;
let tapTimer = null;

function setupMiniScreenTripleTap() {
  const modal = document.getElementById("universalAppModal");
  if (!modal) return;

  modal.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".hud-close-btn") || e.target.closest(".pip-btn")) return;

    tapCount++;
    if (tapCount === 1) {
      tapTimer = setTimeout(() => { tapCount = 0; }, 500);
    } else if (tapCount === 3) {
      clearTimeout(tapTimer);
      tapCount = 0;

      const isFullscreen = modal.classList.toggle("fullscreen-mode");
      playFuturisticChime("PROCESSING");
      if ("vibrate" in navigator) navigator.vibrate([30, 40, 30]);

      updateUI(
        isFullscreen ? "HUD Expanded Fullscreen" : "HUD Restored Mini Mode",
        "Gesture: Triple Tap Activated"
      );
    }
  });
}

// -------------------------------------------------------------------------
// ANDROID NATIVE INTENT DISPATCHER
// -------------------------------------------------------------------------
function launchAndroidIntent(deepLink, intentFallback, webFallback) {
  const link = document.createElement("a");
  link.href = deepLink;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    if (!document.hidden && intentFallback) window.location.href = intentFallback;
  }, 350);

  if (webFallback) {
    setTimeout(() => {
      if (!document.hidden) window.location.href = webFallback;
    }, 1500);
  }
}

// -------------------------------------------------------------------------
// LOCAL COMMAND ENGINE
// -------------------------------------------------------------------------
function executeSingleAction(rawPrompt) {
  const p = rawPrompt.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();

  // 1. HIGHWAY RADAR INTENTS (FUEL, TOLLS, HOSPITALS, REPAIR)
  if (p.includes("fuel") || p.includes("petrol") || p.includes("diesel") || p.includes("gas station")) {
    return scanHighwayAmenity("fuel");
  }
  if (p.includes("toll") || p.includes("toll gate") || p.includes("toll plaza") || p.includes("tax")) {
    return scanHighwayAmenity("toll");
  }
  if (p.includes("hospital") || p.includes("doctor") || p.includes("emergency") || p.includes("medical") || p.includes("ambulance")) {
    return scanHighwayAmenity("hospital");
  }
  if (p.includes("repair") || p.includes("mechanic") || p.includes("puncture") || p.includes("garage") || p.includes("breakdown")) {
    return scanHighwayAmenity("repair");
  }
  if (p.includes("speed") || p.includes("how fast") || p.includes("velocity")) {
    const reply = `Current ground velocity is ${currentSpeedKmh} kilometers per hour, Boss.`;
    speakVoiceQuick(reply);
    updateUI(reply, "Telemetry: GPS Velocity Readout");
    return true;
  }

  // 2. APPS (INSTAGRAM, WHATSAPP, TELEGRAM, YOUTUBE, CAMERA, GMAIL)
  if (/\b(instagram|insta|instgram|ig)\b/.test(p)) {
    const reply = "Launching Instagram, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Instagram");
    launchAndroidIntent("instagram://app", "intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;end", "https://www.instagram.com");
    return true;
  }
  if (/\b(whatsapp|whats app|watsapp|wa)\b/.test(p)) {
    const reply = "Opening WhatsApp, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: WhatsApp");
    launchAndroidIntent("whatsapp://send", "intent://send#Intent;package=com.whatsapp;scheme=whatsapp;end", "https://web.whatsapp.com");
    return true;
  }
  if (/\b(telegram|tg)\b/.test(p)) {
    const reply = "Accessing Telegram, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Telegram");
    launchAndroidIntent("tg://openmessage", "intent:#Intent;package=org.telegram.messenger;scheme=tg;end", "https://web.telegram.org");
    return true;
  }
  if (/\b(youtube|yt)\b/.test(p) && !p.includes("play")) {
    const reply = "Launching YouTube, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: YouTube");
    launchAndroidIntent("vnd.youtube://", "intent://www.youtube.com/#Intent;package=com.google.android.youtube;scheme=https;end", "https://www.youtube.com");
    return true;
  }

  // 3. HARDWARE & CLOCK
  if (p.includes("battery") || p.includes("charge")) {
    const batEl = document.getElementById("batteryStat");
    const val = batEl ? batEl.innerText : "Nominal";
    const reply = `Power reserves are at ${val}, Boss. All systems green.`;
    speakVoiceQuick(reply);
    updateUI(reply, "Action: Battery Diagnostic");
    return true;
  }
  if (["time", "watch", "clock", "samayam"].some(w => p.includes(w))) {
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    const reply = `The time is ${timeStr}, Boss.`;
    speakVoiceQuick(reply);
    updateUI(reply, "Action: Live Time Triggered");
    return true;
  }

  return false;
}

// -------------------------------------------------------------------------
// 5-SECOND COMMAND CAPTURE ENGINE
// -------------------------------------------------------------------------
function resetSilenceTimer() {
  if (speechCaptureTimer) clearTimeout(speechCaptureTimer);
  speechCaptureTimer = setTimeout(() => {
    if (isCommandActive && commandRecognition) {
      try { commandRecognition.stop(); } catch (err) {}
    }
  }, 5000);
}

function startCommandListening() {
  if (!SpeechRecognition) return;

  isCommandActive = true;
  collectedTranscript = "";
  if (wakeRecognition && isWakeActive) {
    try { wakeRecognition.stop(); } catch (e) {}
  }

  setJarvisVisualState("LISTENING");
  updateUI("Listening...", "Siri Mode Active. 5-second silence detection running...");

  commandRecognition = new SpeechRecognition();
  commandRecognition.continuous = true;
  commandRecognition.interimResults = true;
  commandRecognition.lang = "en-IN";

  resetSilenceTimer();

  commandRecognition.onresult = (event) => {
    resetSilenceTimer();
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        collectedTranscript += " " + event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    const current = (collectedTranscript + " " + interim).trim();
    if (current) updateUI(`"${current}"`, "Recording speech...");
  };

  commandRecognition.onerror = (e) => {
    if (e.error !== "no-speech") updateUI("Interrupted", `Status: ${e.error}`);
  };

  commandRecognition.onend = async () => {
    if (speechCaptureTimer) clearTimeout(speechCaptureTimer);
    isCommandActive = false;

    const finalQuery = collectedTranscript.trim();
    const cleaned = finalQuery.replace(/[^a-zA-Z0-9]/g, "").trim();
    if (cleaned.length < 2) {
      setJarvisVisualState("IDLE");
      updateUI("Ready for command, Boss.", "Ignored stray sound.");
      resumeWakeEngine();
      return;
    }

    const handled = executeSingleAction(finalQuery);
    if (handled) {
      setJarvisVisualState("IDLE");
      resumeWakeEngine();
      return;
    }

    setJarvisVisualState("THINKING");
    playFuturisticChime("PROCESSING");

    try {
      const res = await fetch(`${WORKER_ENDPOINT}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalQuery, history: conversationMemory })
      });
      const data = await res.json();
      const reply = data.reply || "Done, Boss.";

      conversationMemory.push({ role: "user", content: finalQuery });
      conversationMemory.push({ role: "assistant", content: reply });
      if (conversationMemory.length > 10) conversationMemory.splice(0, 2);

      updateUI(reply, "Cloud AI Answered");
      speakVoiceQuick(reply);
    } catch (err) {
      updateUI("Telemetry timeout, Boss.", `Error: ${err.message}`);
    }

    setJarvisVisualState("IDLE");
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

// -------------------------------------------------------------------------
// PERSISTENT WAKE ENGINE ("Hey Jarvis")
// -------------------------------------------------------------------------
function initWakeWordEngine() {
  if (!SpeechRecognition) return;

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = false;
  wakeRecognition.lang = "en-IN";

  wakeRecognition.onresult = (event) => {
    const text = event.results[event.resultIndex][0].transcript.trim().toLowerCase();
    const confidence = event.results[event.resultIndex][0].confidence;
    if (confidence && confidence < 0.60) return;

    const wakeRegex = /\b(hey jarvis|jarvis|hai jarvis|ok jarvis|hi jarvis)\b/i;

    if (wakeRegex.test(text)) {
      setJarvisVisualState("LISTENING");
      playFuturisticChime("WAKE");
      triggerHaptic("WAKE");

      updateUI("Yes Boss?", "Wake Word Authenticated");
      speakVoiceQuick("Yes Boss?");

      const directCommand = text.replace(wakeRegex, "").trim();
      if (directCommand.length > 2) {
        handleDirectCommand(directCommand);
      } else {
        setTimeout(() => { startCommandListening(); }, 650);
      }
    }
  };

  wakeRecognition.onerror = (e) => {
    if (e.error !== "no-speech") console.warn("Wake recognizer:", e.error);
  };

  wakeRecognition.onend = () => {
    if (isWakeActive && !isCommandActive) {
      setTimeout(() => {
        try { wakeRecognition.start(); } catch (e) {}
      }, 250);
    }
  };
}

async function handleDirectCommand(prompt) {
  const cleaned = prompt.replace(/[^a-zA-Z0-9]/g, "").trim();
  if (cleaned.length < 2) {
    resumeWakeEngine();
    return;
  }

  updateUI(`"${prompt}"`, `Direct Prompt: "${prompt}"`);
  const wasHandled = executeSingleAction(prompt);
  if (wasHandled) {
    setJarvisVisualState("IDLE");
    resumeWakeEngine();
    return;
  }

  setJarvisVisualState("THINKING");
  playFuturisticChime("PROCESSING");

  try {
    const res = await fetch(`${WORKER_ENDPOINT}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history: conversationMemory })
    });
    const data = await res.json();
    const reply = data.reply || "Done, Boss.";
    updateUI(reply, "Cloud AI Answered");
    speakVoiceQuick(reply);
  } catch (err) {
    updateUI("Telemetry timeout, Boss.", `Error: ${err.message}`);
  }

  setJarvisVisualState("IDLE");
  resumeWakeEngine();
}

async function toggleWakeWord() {
  if (!wakeRecognition) initWakeWordEngine();

  const btn = document.getElementById("wakeToggleBtn");
  const txt = document.getElementById("wakeBtnText");
  const orb = document.getElementById("orbCore");

  if (!isWakeActive) {
    try {
      wakeRecognition.start();
      isWakeActive = true;
      playFuturisticChime("WAKE");
      triggerHaptic("WAKE");

      if (btn) btn.classList.add("active");
      if (txt) txt.innerText = "Wake Mode: ON";
      if (orb) orb.classList.add("wake-active");
      updateUI("Wake Mode Active", "Say 'Hey Jarvis' at any time...");
    } catch (err) {}
  } else {
    isWakeActive = false;
    try { wakeRecognition.stop(); } catch (e) {}
    playFuturisticChime("OFF");
    triggerHaptic("OFF");

    if (btn) btn.classList.remove("active");
    if (txt) txt.innerText = "Wake Mode: OFF";
    if (orb) orb.classList.remove("wake-active");
    updateUI("Ready for command, Boss.", "Wake Mode Off.");
    setJarvisVisualState("IDLE");
  }
}

// Visual and Sound Synthesizer Utilities
function playFuturisticChime(type) {
  try {
    initAudioEngine();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === "WAKE") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === "PROCESSING") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "OFF") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {}
}

function triggerHaptic(type) {
  if (!("vibrate" in navigator)) return;
  if (type === "WAKE") navigator.vibrate([40, 60, 50]);
  else if (type === "OFF") navigator.vibrate(30);
}

function setJarvisVisualState(state) {
  const orb = document.querySelector(".orb-inner");
  const ring = document.querySelector(".orb-ring");
  const glow = document.querySelector(".orb-glow");
  const siriWrapper = document.querySelector(".siri-button-wrapper");

  if (state === "IDLE") {
    if (orb) {
      orb.style.backgroundColor = "#00ffff";
      orb.style.boxShadow = "0 0 28px #00ffff";
      orb.style.transform = "scale(1)";
    }
    if (ring) ring.style.borderColor = "#00ffff";
    if (glow) glow.style.background = "radial-gradient(circle, rgba(0,255,255,0.4) 0%, rgba(0,255,255,0) 70%)";
    if (siriWrapper) siriWrapper.classList.remove("active");
  } else if (state === "LISTENING") {
    if (orb) {
      orb.style.backgroundColor = "#00ff77";
      orb.style.boxShadow = "0 0 38px #00ff77";
      orb.style.transform = "scale(1.15)";
    }
    if (ring) ring.style.borderColor = "#00ff77";
    if (glow) glow.style.background = "radial-gradient(circle, rgba(0,255,119,0.5) 0%, rgba(0,255,119,0) 70%)";
    if (siriWrapper) siriWrapper.classList.add("active");
  } else if (state === "THINKING") {
    if (orb) {
      orb.style.backgroundColor = "#ff9900";
      orb.style.boxShadow = "0 0 45px #ff9900";
      orb.style.transform = "scale(1.05)";
    }
    if (ring) ring.style.borderColor = "#ff9900";
    if (glow) glow.style.background = "radial-gradient(circle, rgba(255,153,0,0.5) 0%, rgba(255,153,0) 70%)";
    if (siriWrapper) siriWrapper.classList.add("active");
  }
}

// -------------------------------------------------------------------------
// INITIALIZE HIGHWAY COPILOT ON PAGE READY
// -------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("siriSpeakBtn");
  if (btn) {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      playFuturisticChime("WAKE");
      if ("vibrate" in navigator) navigator.vibrate(35);
      setJarvisVisualState("LISTENING");
      startCommandListening();
    });
  }

  setupMiniScreenTripleTap();
  initGpsSpeedometer();
});

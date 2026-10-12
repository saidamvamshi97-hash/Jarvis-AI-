// =========================================================================
// J.A.R.V.I.S. MK-VII RUNTIME: FULL CODE (INTENT LAUNCHER + NOISE FILTER + VOICE)
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";
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

// Deep Baritone Male Robotic Voice Engine (Stark Cadence)
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
  if (/[\u0C00-\u0C7F]/.test(text)) {
    targetLang = "te-IN";
  } else if (/[\u0900-\u097F]/.test(text)) {
    targetLang = "hi-IN";
  } else if (/[\u0B80-\u0BFF]/.test(text)) {
    targetLang = "ta-IN";
  }

  utterance.lang = targetLang;

  const maleVoice = selectRoboticMaleVoice(targetLang);
  if (maleVoice) {
    utterance.voice = maleVoice;
  }

  utterance.pitch = 0.78; // Low frequency robotic resonance
  utterance.rate = 1.05;  // Calculated tempo
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}

// -------------------------------------------------------------------------
// LIVE TELEMETRY & TONE SYNTHESIS
// -------------------------------------------------------------------------
async function updateAmbientTelemetry() {
  const batEl = document.getElementById("batteryStat");
  const netEl = document.getElementById("networkStat");

  if (navigator.getBattery && batEl) {
    try {
      const bat = await navigator.getBattery();
      const setLevel = () => {
        batEl.innerText = `${Math.round(bat.level * 100)}%${bat.charging ? " ⚡" : ""}`;
      };
      setLevel();
      bat.addEventListener("levelchange", setLevel);
      bat.addEventListener("chargingchange", setLevel);
    } catch (e) {}
  }

  if (netEl) {
    const updateNet = () => {
      netEl.innerText = navigator.onLine ? "ONLINE" : "OFFLINE";
      netEl.style.color = navigator.onLine ? "#00ffff" : "#ff0055";
    };
    updateNet();
    window.addEventListener("online", updateNet);
    window.addEventListener("offline", updateNet);
  }
}
document.addEventListener("DOMContentLoaded", updateAmbientTelemetry);

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

function updateUI(mainText, debugText) {
  const box = document.getElementById("responseBox");
  const debug = document.getElementById("debugBox");
  if (box) box.innerText = mainText;
  if (debug && debugText) debug.innerText = debugText;
}

// -------------------------------------------------------------------------
// HUD MODAL CONTROLLER
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
  if (modal) modal.style.display = "flex";
}

function closeUniversalApp() {
  const modal = document.getElementById("universalAppModal");
  const frame = document.getElementById("appHudFrame");
  if (modal) modal.style.display = "none";
  if (frame) frame.src = "";
  setJarvisVisualState("IDLE");
}

// -------------------------------------------------------------------------
// ANDROID NATIVE INTENT DISPATCHER
// -------------------------------------------------------------------------
function launchAndroidIntent(intentUrl, fallbackWebUrl) {
  const link = document.createElement("a");
  link.href = intentUrl;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (fallbackWebUrl) {
    setTimeout(() => {
      if (!document.hidden) {
        window.location.href = fallbackWebUrl;
      }
    }, 1500);
  }
}

function executeSingleAction(p) {
  // 1. INSTAGRAM INTENT
  const instaKeywords = ["instagram", "insta", "instgram", "istagram", "gram", "ig"];
  if (instaKeywords.some(k => p.includes(k))) {
    const reply = "Launching Instagram, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Instagram");
    launchAndroidIntent(
      "intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;end",
      "https://www.instagram.com"
    );
    return true;
  }

  // 2. WHATSAPP INTENT
  const waKeywords = ["whatsapp", "whats app", "watshap", "watsap"];
  if (waKeywords.some(k => p.includes(k))) {
    const reply = "Opening WhatsApp, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: WhatsApp");
    launchAndroidIntent(
      "intent://send#Intent;package=com.whatsapp;scheme=whatsapp;end",
      "https://web.whatsapp.com"
    );
    return true;
  }

  // 3. TELEGRAM INTENT
  if (p.includes("telegram")) {
    const reply = "Accessing Telegram comms, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Telegram");
    launchAndroidIntent(
      "intent:#Intent;package=org.telegram.messenger;scheme=tg;end",
      "https://web.telegram.org"
    );
    return true;
  }

  // 4. CAMERA
  if (p.includes("camera") || p.includes("photo") || p.includes("take a picture")) {
    const reply = "Initializing optical sensors, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Camera");
    launchAndroidIntent(
      "intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end"
    );
    return true;
  }

  // 5. GMAIL
  if (p.includes("gmail") || p.includes("email") || p.includes("mail")) {
    const reply = "Opening incoming mail relays, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Gmail");
    launchAndroidIntent(
      "intent:#Intent;package=com.google.android.gm;scheme=googlegmail;end",
      "https://mail.google.com"
    );
    return true;
  }

  // 6. BATTERY DIAGNOSTIC
  if (p.includes("battery") || p.includes("charge") || p.includes("power level")) {
    const batEl = document.getElementById("batteryStat");
    const val = batEl ? batEl.innerText : "Nominal";
    const reply = `Power reserves are at ${val}, Boss. All systems green.`;
    speakVoiceQuick(reply);
    updateUI(reply, "Action: Battery Diagnostic");
    return true;
  }

  // 7. CLOCK / TIME
  const timeTriggers = ["time", "watch", "clock", "samayam", "time entha", "samay", "neram", "ghadi"];
  if (timeTriggers.some(w => p.includes(w))) {
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    const reply = `The time is ${timeStr}, Boss.`;
    speakVoiceQuick(reply);
    updateUI(reply, "Action: Live Time Triggered");
    return true;
  }

  // 8. WEATHER RADAR HUD
  if (p.includes("weather") || p.includes("rain") || p.includes("climate") || p.includes("varsham") || p.includes("mausam")) {
    const reply = "Streaming live radar telemetry, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Weather Radar");
    openUniversalApp(
      "Weather Radar",
      "https://embed.windy.com/embed2.html?lat=16.36&lon=78.06&detailLat=16.36&detailLon=78.06&width=400&height=250&zoom=7&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1",
      "https://www.windy.com"
    );
    return true;
  }

  // 9. LIVE CRICKET HUD
  if (p.includes("cricket") || p.includes("score") || p.includes("ipl") || p.includes("match")) {
    const reply = "Streaming live cricket scorecard in HUD, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Cricket Scores");
    openUniversalApp("Live Cricket", "https://m.cricbuzz.com/cricket-match/live-scores", "https://www.cricbuzz.com");
    return true;
  }

  // 10. CALCULATOR
  if (p.includes("calculator") || p.includes("calculate") || p.includes("lekkalu") || p.includes("hisab")) {
    const reply = "Deploying math processing matrix, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Calculator");
    openUniversalApp("Calculator", "https://www.desmos.com/scientific", "https://www.desmos.com/scientific");
    return true;
  }

  // 11. WIKIPEDIA
  if (p.startsWith("wiki") || p.startsWith("who is") || p.startsWith("what is")) {
    const topic = p.replace(/^(wiki|who is|what is|tell me about)/gi, "").trim();
    if (topic.length > 2) {
      const reply = `Retrieving intelligence on ${topic}, Boss.`;
      speakVoiceQuick(reply);
      updateUI(reply, `Dispatched: Wikipedia -> ${topic}`);
      openUniversalApp(`WIKI // ${topic}`, `https://en.m.wikipedia.org/wiki/${encodeURIComponent(topic)}`, `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`);
      return true;
    }
  }

  // 12. YOUTUBE / SPOTIFY STREAMING
  const musicTriggers = ["play", "paly", "ply", "song", "songs", "paata", "paatalu", "music", "youtube", "spotify"];
  if (musicTriggers.some(w => p.includes(w))) {
    let cleanQuery = p
      .replace(/when\s+(i\s+have\s+to|do\s+i|should\s+i)/gi, "")
      .replace(/^(hey jarvis|jarvis|please|bhayya|mama|bro|can you)/gi, "")
      .replace(/\b(play|paly|ply|start|listen to|watch|open|choodu|vinu|pettu|lagao|chalao)\b/gi, "")
      .replace(/\b(on youtube|in youtube|youtube|on spotify|spotify|lo|la)\b/gi, "")
      .trim();

    if (!cleanQuery) cleanQuery = "Telugu latest hit songs";

    if (p.includes("spotify")) {
      const reply = `Streaming ${cleanQuery} on Spotify, Boss.`;
      speakVoiceQuick(reply);
      updateUI(reply, `Dispatched: Spotify -> "${cleanQuery}"`);
      openUniversalApp(`Spotify // ${cleanQuery}`, `https://open.spotify.com/embed/search/${encodeURIComponent(cleanQuery)}`, `spotify:search:${encodeURIComponent(cleanQuery)}`);
    } else {
      const reply = `Playing ${cleanQuery} on YouTube, Boss.`;
      speakVoiceQuick(reply);
      updateUI(reply, `Launching YouTube: "${cleanQuery}"`);
      launchAndroidIntent(
        `intent://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}#Intent;scheme=https;package=com.google.android.youtube;end`,
        `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`
      );
    }
    return true;
  }

  return false;
}

// -------------------------------------------------------------------------
// 5-SECOND COMMAND CAPTURE + NOISE/SYMBOL FILTERING
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

    // FILTER OUT BRACKETS / PUNCTUATION-ONLY SOUNDS LIKE "("
    const cleaned = finalQuery.replace(/[^a-zA-Z0-9]/g, "").trim();
    if (cleaned.length < 2) {
      setJarvisVisualState("IDLE");
      updateUI("Ready for command, Boss.", "Ignored stray sound.");
      resumeWakeEngine();
      return;
    }

    // 1. Check local native intents first
    const handled = executeSingleAction(finalQuery.toLowerCase());
    if (handled) {
      setJarvisVisualState("IDLE");
      resumeWakeEngine();
      return;
    }

    // 2. Dispatch to Cloud AI Brain with Memory
    setJarvisVisualState("THINKING");
    playFuturisticChime("PROCESSING");

    try {
      const res = await fetch(WORKER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalQuery,
          history: conversationMemory
        })
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
        setTimeout(() => {
          startCommandListening();
        }, 650);
      }
    } else {
      const debug = document.getElementById("debugBox");
      if (debug) debug.innerText = `Ignored Ambient: "${text}"`;
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
  
  const wasHandled = executeSingleAction(prompt.toLowerCase());
  if (wasHandled) {
    setJarvisVisualState("IDLE");
    resumeWakeEngine();
    return;
  }

  setJarvisVisualState("THINKING");
  playFuturisticChime("PROCESSING");

  try {
    const res = await fetch(WORKER_ENDPOINT, {
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

// -------------------------------------------------------------------------
// SIRI BUTTON CONTROLLER
// -------------------------------------------------------------------------
function setupSiriButton() {
  const btn = document.getElementById("siriSpeakBtn");
  if (!btn) return;

  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    playFuturisticChime("WAKE");
    if ("vibrate" in navigator) navigator.vibrate(35);
    setJarvisVisualState("LISTENING");
    startCommandListening();
  });
}

document.addEventListener("DOMContentLoaded", setupSiriButton);

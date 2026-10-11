// =========================================================================
// J.A.R.V.I.S. INTERACTIVE RUNTIME: SYNCHRONIZED SIRI ORB + 5S AUTO-CUT TIMER
// (EXCLUSIVE ANDROID SPEECH RECOGNITION PIPELINE - NO MIC HARDWARE CONFLICT)
// =========================================================================

const WORKER_ENDPOINT = "https://jarvis-automation.saidamvamshi97.workers.dev/api/ask";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let wakeRecognition = null;
let commandRecognition = null;
let isWakeActive = false;
let isCommandActive = false;

// 5-Second Silence Auto-Cut Timer & Transcript Buffer
let speechCaptureTimer = null;
let collectedTranscript = "";

// Web Audio Synthesizer Context
let audioCtx = null;

function initAudioEngine() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}
window.addEventListener("touchstart", initAudioEngine, { once: true });
window.addEventListener("click", initAudioEngine, { once: true });

// Synthesized Tone Generator (Web Audio API)
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
  if (type === "WAKE") {
    navigator.vibrate([40, 60, 50]);
  } else if (type === "OFF") {
    navigator.vibrate(30);
  }
}

// Visual State Controller (Arc Reactor + Siri Button Wrapper)
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
  // 1. Time / Clock
  const timeTriggers = ["time", "watch", "clock", "samayam", "time entha", "samay", "neram", "ghadi"];
  if (timeTriggers.some(w => p.includes(w))) {
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    const reply = `The time is ${timeStr}, Boss.`;
    speakVoiceQuick(reply);
    updateUI(reply, "Action: Live Time Triggered");
    return true;
  }

  // 2. Weather Radar
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

  // 3. Cricket Scores
  if (p.includes("cricket") || p.includes("score") || p.includes("ipl") || p.includes("match")) {
    const reply = "Streaming live cricket scorecard in HUD, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Cricket Scores");
    openUniversalApp("Live Cricket", "https://m.cricbuzz.com/cricket-match/live-scores", "https://www.cricbuzz.com");
    return true;
  }

  // 4. Calculator
  if (p.includes("calculator") || p.includes("calculate") || p.includes("lekkalu") || p.includes("hisab")) {
    const reply = "Opening calculation core, Boss.";
    speakVoiceQuick(reply);
    updateUI(reply, "Dispatched: Calculator");
    openUniversalApp("Calculator", "https://www.desmos.com/scientific", "https://www.desmos.com/scientific");
    return true;
  }

  // 5. Wikipedia
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

  // 6. Music & YouTube Intent
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
      openUniversalApp(`Spotify // ${cleanQuery}`, `https://open.spotify.com/embed/search/${encodeURIComponent(cleanQuery)}`, `spotify:search:${encodeURIComponent(cleanQuery)}`);
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

  // 7. Navigation
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
// 5-SECOND DYNAMIC COMMAND LISTENER
// -------------------------------------------------------------------------
function resetSilenceTimer() {
  if (speechCaptureTimer) clearTimeout(speechCaptureTimer);

  // Auto-stops recognition after 5 seconds of silence
  speechCaptureTimer = setTimeout(() => {
    if (isCommandActive && commandRecognition) {
      try {
        commandRecognition.stop();
      } catch (err) {}
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
    resetSilenceTimer(); // Reset 5s countdown every time a word is spoken

    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        collectedTranscript += " " + event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }

    const currentText = (collectedTranscript + " " + interim).trim();
    if (currentText) {
      updateUI(`"${currentText}"`, "Recording speech...");
    }
  };

  commandRecognition.onerror = (e) => {
    if (e.error !== "no-speech") {
      updateUI("Listening interrupted.", `Mic Status: ${e.error}`);
    }
  };

  commandRecognition.onend = async () => {
    if (speechCaptureTimer) clearTimeout(speechCaptureTimer);
    isCommandActive = false;

    const finalQuery = collectedTranscript.trim();

    if (!finalQuery) {
      setJarvisVisualState("IDLE");
      updateUI("Ready for command, Boss.", "No voice detected.");
      resumeWakeEngine();
      return;
    }

    updateUI(`"${finalQuery}"`, "Processing query...");

    const wasHandled = await interceptLocalAction(finalQuery);
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
        body: JSON.stringify({ prompt: finalQuery })
      });
      const data = await res.json();
      const reply = data.reply || "Done, Boss.";
      updateUI(reply, "Cloud AI Answered");
      speakVoiceQuick(reply);
    } catch (err) {
      updateUI("Systems link timeout, Boss.", `Error: ${err.message}`);
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
// PERSISTENT 24/7 WAKE WORD ENGINE ("Hey Jarvis")
// -------------------------------------------------------------------------
function initWakeWordEngine() {
  if (!SpeechRecognition) return;

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = false;
  wakeRecognition.lang = "en-IN";

  wakeRecognition.onresult = (event) => {
    const result = event.results[event.resultIndex];
    const text = result[0].transcript.trim().toLowerCase();
    const confidence = result[0].confidence;

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
        }, 600);
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
  updateUI(`"${prompt}"`, `Direct Prompt: "${prompt}"`);
  
  const wasHandled = await interceptLocalAction(prompt);
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
    } catch (err) {
      console.warn("Wake init error:", err);
    }
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
// SIRI BUTTON PUSH-TO-TALK & TAP CONTROLLER
// -------------------------------------------------------------------------
let pressTimer = null;
let isHoldingButton = false;
let touchStartTime = 0;

function setupSiriButton() {
  const btn = document.getElementById("siriSpeakBtn");
  const wrapper = document.querySelector(".siri-button-wrapper");
  if (!btn || !wrapper) return;

  const handlePointerDown = (e) => {
    e.preventDefault();
    touchStartTime = Date.now();
    isHoldingButton = false;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    playFuturisticChime("WAKE");
    if ("vibrate" in navigator) navigator.vibrate(35);

    setJarvisVisualState("LISTENING");

    pressTimer = setTimeout(() => {
      isHoldingButton = true;
    }, 350);

    startCommandListening();
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    clearTimeout(pressTimer);
    const pressDuration = Date.now() - touchStartTime;

    if (pressDuration > 350 || isHoldingButton) {
      if (commandRecognition && isCommandActive) {
        try {
          commandRecognition.stop();
        } catch (err) {}
      }
      if ("vibrate" in navigator) navigator.vibrate(20);
    } else {
      updateUI("Listening...", "Siri Mode: Tap active, speak request...");
    }
  };

  btn.addEventListener("pointerdown", handlePointerDown);
  btn.addEventListener("pointerup", handlePointerUp);
  btn.addEventListener("pointercancel", handlePointerUp);
}

document.addEventListener("DOMContentLoaded", setupSiriButton);

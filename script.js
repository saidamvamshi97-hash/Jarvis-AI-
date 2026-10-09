 // =========================================================================
// J.A.R.V.I.S. MOBILE ASSISTANT - BULLETPROOF CONTROLLER (EPISODE 05-07)
// =========================================================================

// --- 1. DOM Elements (Safe Dual-ID Fallback Selector) ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg") || document.getElementById("input");
const sendBtn = document.getElementById("send") || document.getElementById("send-btn");
const micBtn = document.getElementById("mic") || document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn") || document.getElementById("cam");
const clearBtn = document.getElementById("clear-btn") || document.getElementById("clear");
const imgInput = document.getElementById("img-input") || document.getElementById("camera-input");
const arcCore = document.getElementById("arc-core") || document.querySelector(".center");
const batteryRow = document.getElementById("battery-row");

// --- 2. State & Long-Term Memory ---
let conversationHistory = [];
try {
  const saved = localStorage.getItem("jarvis_memory");
  if (saved) conversationHistory = JSON.parse(saved);
} catch (e) {
  conversationHistory = [];
}

function persistMemory() {
  try {
    localStorage.setItem("jarvis_memory", JSON.stringify(conversationHistory.slice(-10)));
  } catch (e) {}
}

// --- 3. Reactive Arc Reactor Visuals ---
function setReactor(state) {
  const centerRing = document.querySelector(".center");
  if (!centerRing) return;

  if (state === "listening") {
    centerRing.style.background = "#ff0055";
    centerRing.style.boxShadow = "0 0 35px #ff0055";
  } else if (state === "thinking") {
    centerRing.style.background = "#ffaa00";
    centerRing.style.boxShadow = "0 0 35px #ffaa00";
  } else if (state === "speaking") {
    centerRing.style.background = "#00ffaa";
    centerRing.style.boxShadow = "0 0 35px #00ffaa";
  } else {
    centerRing.style.background = "#00e5ff";
    centerRing.style.boxShadow = "0 0 35px #00e5ff";
  }
}

// --- 4. Chat Message Appender ---
function add(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerHTML = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- 5. Mobile Speech Synthesis ---
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const clean = text.replace(/[*#_`~]/g, "").trim();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "en-US";
  utterance.rate = 1.05;
  utterance.pitch = 0.95;

  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith("en-GB") || v.lang.startsWith("en-US") || v.lang.startsWith("en"));
  if (enVoice) utterance.voice = enVoice;

  utterance.onstart = () => setReactor("speaking");
  utterance.onend = () => setReactor("idle");
  utterance.onerror = () => setReactor("idle");

  window.speechSynthesis.speak(utterance);
}

// Pre-unlock speech synthesizer on touch
window.addEventListener("touchstart", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }
}, { once: true });

// --- 6. API Key Manager ---
function getApiKey() {
  return localStorage.getItem("jarvis_key") || localStorage.getItem("GEMINI_API_KEY") || null;
}

// --- 7. Local Hardware & Fast Commands (Immediate Response) ---
function checkLocalCommand(cmd) {
  const clean = cmd.toLowerCase().trim();

  // Instant local time
  if (clean.includes("time") || clean === "what is the time" || clean === "what is the time now") {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `The current time is ${timeStr}, Boss.`;
  }

  // Instant local date
  if (clean.includes("date today") || clean === "what is today" || clean === "date") {
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `Today is ${dateStr}, Boss.`;
  }

  // Media Playback
  if (clean.startsWith("play ") || clean.includes("play song") || clean.includes("play music")) {
    const query = clean.replace(/play song|play music|play/gi, "").trim();
    if (query) {
      setTimeout(() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank"), 1000);
      return `Streaming "${query}" via YouTube, Boss.`;
    }
  }

  return null;
}

// --- 8. AI Uplink & Satellite Fallback ---
async function askJarvis(promptText) {
  if (!promptText || promptText.trim() === "") return;

  add(`<span class="prefix">YOU:</span> ${promptText}`, "user");
  if (input) input.value = "";

  // 1. Instant local fast command check
  const localReply = checkLocalCommand(promptText);
  if (localReply) {
    add(`<span class="prefix">J.A.R.V.I.S:</span> ${localReply}`, 'ai');
    speak(localReply);
    return;
  }

  add('<span class="prefix">J.A.R.V.I.S:</span> Thinking...', 'ai');
  setReactor("thinking");

  conversationHistory.push({ role: "user", parts: [{ text: promptText }] });
  if (conversationHistory.length > 6) conversationHistory = conversationHistory.slice(-6);

  let finalReply = null;
  const key = getApiKey();

  // Tier 1: Gemini Uplink
  if (key) {
    const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    for (const m of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "You are J.A.R.V.I.S, addressing Tony Stark as Boss. Respond sharply in 1-2 sentences: " + promptText }] }]
          })
        });
        const data = await res.json();
        if (!data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          finalReply = data.candidates[0].content.parts[0].text;
          break;
        }
      } catch (err) {}
    }
  }

  // Tier 2: Free Unlimited Public Satellite (Pollinations AI)
  if (!finalReply) {
    try {
      const fallbackUrl = `https://text.pollinations.ai/${encodeURIComponent(promptText)}?system=${encodeURIComponent("You are J.A.R.V.I.S. Respond sharply to Boss in 1-2 sentences.")}`;
      const backupRes = await fetch(fallbackUrl);
      if (backupRes.ok) {
        const text = await backupRes.text();
        if (text && text.trim().length > 0) finalReply = text.trim();
      }
    } catch (err) {}
  }

  if (finalReply) {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> ${finalReply}`;
    conversationHistory.push({ role: "model", parts: [{ text: finalReply }] });
    persistMemory();
    speak(finalReply);
  } else {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Uplink offline. Please check network.`;
    speak("Uplink offline, Boss.");
    conversationHistory.pop();
  }

  setReactor("idle");
}

// --- 9. SEND & KEYBOARD LISTENERS ---
if (sendBtn) {
  sendBtn.onclick = () => {
    const val = input ? input.value.trim() : "";
    if (val) askJarvis(val);
  };
}

if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = input.value.trim();
      if (val) askJarvis(val);
    }
  });
}

// --- 10. CLEAR MEMORY BUTTON ---
if (clearBtn) {
  clearBtn.onclick = () => {
    conversationHistory = [];
    localStorage.removeItem("jarvis_memory");
    add('<span class="prefix">SYSTEM:</span> Memory wiped clean, Boss.', 'ai');
    speak("Memory cleared, Boss.");
  };
}

// --- 11. CAMERA VISION ("THE EYES") ---
if (camBtn && imgInput) {
  camBtn.onclick = () => imgInput.click();

  imgInput.onchange = () => {
    const file = imgInput.files[0];
    if (!file) return;

    add('<span class="prefix">YOU:</span> [Photo Telemetry Uploaded]', 'user');
    add('<span class="prefix">J.A.R.V.I.S:</span> Analyzing visual telemetry...', 'ai');
    setReactor("thinking");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const key = getApiKey();
      let reply = null;

      if (key) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Describe what you see in 1-2 sharp sentences addressing Boss:" },
                  { inline_data: { mime_type: file.type, data: base64 } }
                ]
              }]
            })
          });
          const data = await res.json();
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            reply = data.candidates[0].content.parts[0].text;
          }
        } catch (e) {}
      }

      if (reply) {
        chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> ${reply}`;
        speak(reply);
      } else {
        chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Visual optical feed failed to process, Boss.`;
        speak("Vision scan failed, Boss.");
      }
      setReactor("idle");
    };
    reader.readAsDataURL(file);
  };
}

// --- 12. SPEECH RECOGNITION (MIC) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition && micBtn) {
  const rec = new SpeechRecognition();
  rec.lang = "en-US";
  rec.interimResults = false;

  micBtn.onclick = () => {
    try {
      setReactor("listening");
      micBtn.innerText = "🔴";
      rec.start();
    } catch (e) {
      rec.stop();
      micBtn.innerText = "🎤";
      setReactor("idle");
    }
  };

  rec.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    if (input) input.value = transcript;
    askJarvis(transcript);
  };

  rec.onend = () => {
    micBtn.innerText = "🎤";
    setReactor("idle");
  };

  rec.onerror = () => {
    micBtn.innerText = "🎤";
    setReactor("idle");
  };
}

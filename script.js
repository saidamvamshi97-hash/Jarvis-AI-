// =========================================================================
// J.A.R.V.I.S. ULTRA LOW-LATENCY CONTROLLER (SUB-SECOND EXECUTION)
// =========================================================================

// --- 1. DOM Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg") || document.getElementById("input");
const sendBtn = document.getElementById("send") || document.getElementById("send-btn");
const micBtn = document.getElementById("mic") || document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn") || document.getElementById("cam");
const clearBtn = document.getElementById("clear-btn") || document.getElementById("clear");
const imgInput = document.getElementById("img-input") || document.getElementById("camera-input");

// --- 2. Compact Memory (Limited to last 3 items for fastest payload size) ---
let MEMORY = [];
try {
  const saved = localStorage.getItem("jarvis_memory");
  if (saved) MEMORY = JSON.parse(saved).slice(-3);
} catch (e) {
  MEMORY = [];
}

function saveMemory() {
  try {
    localStorage.setItem("jarvis_memory", JSON.stringify(MEMORY.slice(-3)));
  } catch (e) {}
}

// --- 3. Instant UI & Speech Synthesis ---
function add(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerHTML = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

function speakFast(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const clean = text.replace(/<[^>]*>?/gm, "").replace(/[*#_`~]/g, "").trim();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "en-US";
  utterance.rate = 1.15; // Slightly faster playback for snappier audio response
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith("en-US") || v.lang.startsWith("en"));
  if (enVoice) utterance.voice = enVoice;

  window.speechSynthesis.speak(utterance);
}

// --- 4. Zero-Latency Local Action Engine (0 ms) ---
function runFastAction(cmd) {
  const clean = cmd.toLowerCase().trim();

  // Instant Clock
  if (clean.includes("time")) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `It is ${time}, Boss.`;
  }

  // Instant Date
  if (clean.includes("date") || clean.includes("today")) {
    const date = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return `Today is ${date}, Boss.`;
  }

  // Instant Media Launcher
  if (clean.includes("youtube") || clean.includes("song") || clean.includes("play") || clean.includes("music")) {
    let q = clean
      .replace(/\b(open|play|search|find|on|in|to|stream|listen)\b/gi, "")
      .replace(/\b(youtube|spotify|music|song|songs|video|videos)\b/gi, "")
      .trim() || "Telugu songs";

    const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    window.open(targetUrl, "_blank");
    return `Streaming "${q}" on YouTube, Boss.`;
  }

  return null;
}

// --- 5. High-Speed Gemini Flash Engine ---
async function askFastAI(promptText) {
  if (!promptText || !promptText.trim()) return;

  add(`<span class="prefix">YOU:</span> ${promptText}`, "user");
  if (input) input.value = "";

  // 1. Check local device triggers first (0 ms delay)
  const localOutput = runFastAction(promptText);
  if (localOutput) {
    add(`<span class="prefix">J.A.R.V.I.S:</span> ${localOutput}`, "ai");
    speakFast(localOutput);
    return;
  }

  add('<span class="prefix">J.A.R.V.I.S:</span> ...', 'ai');

  const key = localStorage.getItem("jarvis_key");
  let reply = null;

  if (key) {
    try {
      // Direct call to Gemini 2.0 Flash with token cap and 4-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const contents = MEMORY.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      contents.push({ role: "user", parts: [{ text: promptText }] });

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: contents,
          systemInstruction: { parts: [{ text: "You are J.A.R.V.I.S. Respond directly to Boss in one short, complete sentence without preamble." }] },
          generationConfig: {
            maxOutputTokens: 60, // Short response cap dramatically lowers latency
            temperature: 0.2
          }
        })
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        reply = data.candidates[0].content.parts[0].text.trim();
      }
    } catch (e) {
      console.warn("Primary fast endpoint skipped or timed out:", e);
    }
  }

  // Backup keyless endpoint fallback
  if (!reply) {
    try {
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(promptText)}?system=${encodeURIComponent("Respond to Boss in 1 short sentence.")}`);
      if (res.ok) reply = (await res.text()).trim();
    } catch (e) {}
  }

  if (reply) {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> ${reply}`;
    MEMORY.push({ role: "user", text: promptText });
    MEMORY.push({ role: "model", text: reply });
    saveMemory();
    speakFast(reply);
  } else {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Ready. Please check key.`;
  }
}

// --- 6. Event Listeners ---
if (sendBtn) {
  sendBtn.onclick = () => {
    const val = input ? input.value.trim() : "";
    if (val) askFastAI(val);
  };
}

if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = input.value.trim();
      if (val) askFastAI(val);
    }
  });
}

// Low-latency voice setup
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR && micBtn) {
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;

  micBtn.onclick = () => {
    micBtn.innerText = "🔴";
    rec.start();
  };

  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    if (input) input.value = text;
    askFastAI(text);
  };

  rec.onend = () => { micBtn.innerText = "🎤"; };
  rec.onerror = () => { micBtn.innerText = "🎤"; };
}

if (clearBtn) {
  clearBtn.onclick = () => {
    MEMORY = [];
    localStorage.removeItem("jarvis_memory");
    add("SYSTEM: Memory cleared.", "ai");
  };
}

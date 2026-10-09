// ================================================================
// J.A.R.V.I.S. MOBILE ASSISTANT: TOOLS, VISION, MEMORY & AI UPLINK
// ================================================================

// ===== 1. API KEY & SMART MODEL FALLBACKS =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key (or leave blank to use the public backup satellite):');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

const MODELS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

// ===== 2. LONG-TERM MEMORY ENGINE =====
let MEMORY = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');

function saveMemory() {
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY.slice(-12)));
}

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');
const clearBtn = document.getElementById('clear-btn');
const camBtn = document.getElementById('cam-btn');
const imgInput = document.getElementById('img-input');

// Render persistent memory items on startup
MEMORY.forEach(m => add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));

// ===== 3. AUTONOMOUS TOOL SUITE (EPISODE 06) =====
let activeTimer = null;

// Tool A: Natural Voice Timer & Alarm
function handleTimerTool(cleanText) {
  const match = cleanText.match(/timer for (\d+)\s*(second|minute|min|sec|seconds|minutes)/i);
  if (match) {
    let duration = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit.startsWith("min")) duration *= 60;

    const confirmation = `Timer initialized for ${match[1]}${unit}. Counting down, Boss.`;
    add(`J.A.R.V.I.S: ${confirmation}`, 'ai');
    speak(confirmation);

    if (activeTimer) clearTimeout(activeTimer);

    activeTimer = setTimeout(() => {
      const alertMsg = "Alert, Boss: Your timer has expired!";
      add(`J.A.R.V.I.S: ${alertMsg}`, 'ai');
      speak(alertMsg);
      if (navigator.vibrate) navigator.vibrate([150, 60, 150, 60, 300]);
    }, duration * 1000);

    return true;
  }
  return false;
}

// Tool B: Real-Time Crypto Price Lookup
async function handleCryptoTool(cleanText) {
  if (cleanText.includes("crypto") || cleanText.includes("bitcoin") || cleanText.includes("ethereum") || cleanText.includes("solana")) {
    let coin = "bitcoin";
    if (cleanText.includes("ethereum") || cleanText.includes("eth")) coin = "ethereum";
    if (cleanText.includes("solana") || cleanText.includes("sol")) coin = "solana";

    add('J.A.R.V.I.S: Fetching market metrics...', 'ai');
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,inr`);
      const data = await res.json();
      if (data && data[coin]) {
        const usdPrice = data[coin].usd.toLocaleString();
        const inrPrice = data[coin].inr.toLocaleString();
        const reply = `${coin.toUpperCase()} is currently trading at$${usdPrice} (₹${inrPrice}), Boss.`;
        chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
        speak(reply);
        return true;
      }
    } catch (e) {
      console.warn("Crypto API unavailable:", e);
    }
  }
  return false;
}

// Tool C: Direct Media & Streaming Launch
function handleMediaTool(cleanText) {
  if (cleanText.includes("play ") || cleanText.includes("play song ") || cleanText.includes("music")) {
    const query = cleanText.replace(/play song|play music|play/gi, "").trim();
    if (query) {
      const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      setTimeout(() => window.open(targetUrl, "_blank"), 1000);
      const reply = `Streaming "${query}" via YouTube, Boss.`;
      add(`J.A.R.V.I.S: ${reply}`, 'ai');
      speak(reply);
      return true;
    }
  }
  return false;
}

// Tool D: Instant Local Time & Date
function handleTimeDateTool(cleanText) {
  if (cleanText.includes("time") || cleanText.includes("time now")) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const reply = `The current time is ${timeStr}, Boss.`;
    add(`J.A.R.V.I.S: ${reply}`, 'ai');
    speak(reply);
    return true;
  }
  if (cleanText.includes("date today") || cleanText === "date" || cleanText === "what is today") {
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const reply = `Today is ${dateStr}, Boss.`;
    add(`J.A.R.V.I.S: ${reply}`, 'ai');
    speak(reply);
    return true;
  }
  return false;
}

// Unified Tool Dispatcher
async function runTools(promptText) {
  const clean = promptText.toLowerCase().trim();
  if (handleTimerTool(clean)) return true;
  if (await handleCryptoTool(clean)) return true;
  if (handleMediaTool(clean)) return true;
  if (handleTimeDateTool(clean)) return true;
  return false;
}

// ===== 4. GEMINI BRAIN & MULTI-TIER UPLINK =====
async function callGemini(p) {
  const contents = MEMORY.slice(-12).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
  contents.push({ role: 'user', parts: [{ text: p }] });

  let lastErr;

  // Tier 1: Primary Gemini Uplink
  if (API_KEY) {
    for (const m of MODELS) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: contents })
        });
        const data = await res.json();
        if (data.error) {
          lastErr = new Error(data.error.message);
          if (/high demand|temporar|quota|rate|unavailable|deprecated/i.test(data.error.message)) continue;
          throw lastErr;
        }
        return data.candidates[0].content.parts[0].text;
      } catch (e) {
        lastErr = e;
      }
    }
  }

  // Tier 2: Free Satellite Backup (Keyless & Unlimited)
  try {
    const backupUrl = `https://text.pollinations.ai/${encodeURIComponent(p)}?system=${encodeURIComponent("You are J.A.R.V.I.S. Respond sharply to Boss in 1-2 short sentences.")}`;
    const backupRes = await fetch(backupUrl);
    if (backupRes.ok) {
      const backupText = await backupRes.text();
      if (backupText && backupText.trim().length > 0) {
        return backupText.trim();
      }
    }
  } catch (err) {
    console.error("Satellite failover error:", err);
  }

  throw lastErr || new Error("All uplinks offline.");
}

async function askGemini(p) {
  // Check autonomous tools first
  const isHandledByTool = await runTools(p);
  if (isHandledByTool) return;

  add('J.A.R.V.I.S: Thinking...', 'ai');
  try {
    const reply = await callGemini(p);
    MEMORY.push({ role: 'user', text: p });
    MEMORY.push({ role: 'model', text: reply });
    saveMemory();
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  } catch (e) {
    chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR ' + e.message;
  }
}

// ===== 5. VISION ENGINE ("THE EYES") =====
if (camBtn && imgInput) {
  camBtn.onclick = () => imgInput.click();
  imgInput.onchange = () => {
    const file = imgInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      const q = input.value.trim() || 'What do you see in front of you? Describe briefly for Boss.';
      add('YOU: [IMAGE] ' + q, 'user');
      input.value = '';
      askVision(base64, file.type, q);
    };
    reader.readAsDataURL(file);
  };
}

async function askVision(base64, mime, q) {
  add('J.A.R.V.I.S: Analyzing visual stream...', 'ai');
  let lastErr;

  if (API_KEY) {
    for (const m of MODELS) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: q },
                { inline_data: { mime_type: mime, data: base64 } }
              ]
            }]
          })
        });

        const data = await res.json();
        if (data.error) {
          lastErr = new Error(data.error.message);
          if (/high demand|temporar|quota|rate|unavailable|deprecated/i.test(data.error.message)) continue;
          throw lastErr;
        }

        const reply = data.candidates[0].content.parts[0].text;
        chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
        speak(reply);
        return;
      } catch (e) {
        lastErr = e;
      }
    }
  }

  chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR ' + (lastErr ? lastErr.message : "Vision uplink offline.");
}

// ===== 6. VOICE, MEMORY CONTROLS & UTILS =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR && micBtn) {
  const rec = new SR();
  rec.lang = 'en-US';
  rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    add('YOU: ' + t, 'user');
    askGemini(t);
  };
  micBtn.onclick = () => {
    rec.start();
    micBtn.innerText = 'LISTENING...';
  };
  rec.onend = () => {
    micBtn.innerText = '🎤';
  };
}

let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices();
}
loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(t) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t.replace(/[*#_`~]/g, ""));
  u.rate = 1.05;
  u.pitch = 0.85;
  const v = voices.find(v => v.lang.startsWith('en'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

document.getElementById('send').onclick = () => {
  const t = input.value.trim();
  if (!t) return;
  add('YOU: ' + t, 'user');
  input.value = '';
  askGemini(t);
};

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const t = input.value.trim();
    if (!t) return;
    add('YOU: ' + t, 'user');
    input.value = '';
    askGemini(t);
  }
});

if (clearBtn) {
  clearBtn.onclick = () => {
    MEMORY = [];
    saveMemory();
    chat.innerHTML = '';
    add('SYSTEM: Long-term memory cleared.', 'ai');
    speak('Memory cleared, Boss.');
  };
}

function add(t, w) {
  const d = document.createElement('div');
  d.className = 'msg ' + w;
  d.innerText = t;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

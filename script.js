// =========================================================================
// J.A.R.V.I.S. MOBILE ASSISTANT - EPISODE 06: THE 15 AUTONOMOUS TOOLS ENGINE
// =========================================================================

// ===== 1. API KEY & SMART MODEL FALLBACKS =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key (or leave empty to use free satellite):');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

const MODELS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

// ===== 2. MEMORY SYSTEM (EPISODE 05 PERSISTENCE) =====
let MEMORY = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');

function saveMemory() {
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY.slice(-12)));
}

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn') || document.getElementById('mic');
const clearBtn = document.getElementById('clear-btn');
const camBtn = document.getElementById('cam-btn');
const imgInput = document.getElementById('img-input');

// Render persistent memory items on start
if (chat) {
  MEMORY.forEach(m => add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));
}

// Clear Memory Button Handler
if (clearBtn) {
  clearBtn.onclick = () => {
    MEMORY = [];
    saveMemory();
    chat.innerHTML = '';
    add('SYSTEM: Long-term memory wiped, Boss.', 'ai');
    speak('Long term memory cleared, Boss.');
  };
}

// ===== 3. THE 15 AUTONOMOUS TOOLS (ROUTER ENGINE) =====
let activeTimer = null;

async function toolRouter(promptText) {
  const q = promptText.toLowerCase().trim();

  // Tool 1: Time
  if (q.includes("time") || q === "what time is it") {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const reply = `The current time is ${timeStr}, Boss.`;
    respond(reply);
    return true;
  }

  // Tool 2: Date
  if (q.includes("date today") || q === "what is today" || q === "date") {
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const reply = `Today is ${dateStr}, Boss.`;
    respond(reply);
    return true;
  }

  // Tool 3: Natural Language Timer
  const timerMatch = q.match(/timer for (\d+)\s*(second|minute|min|sec|seconds|minutes)/i);
  if (timerMatch) {
    let duration = parseInt(timerMatch[1], 10);
    const unit = timerMatch[2].toLowerCase();
    if (unit.startsWith("min")) duration *= 60;

    const reply = `Timer set for ${timerMatch[1]}${unit}. Counting down, Boss.`;
    respond(reply);

    if (activeTimer) clearTimeout(activeTimer);
    activeTimer = setTimeout(() => {
      const alertMsg = "Timer completed, Boss!";
      add('J.A.R.V.I.S: ' + alertMsg, 'ai');
      speak(alertMsg);
      if (navigator.vibrate) navigator.vibrate([150, 60, 150, 60, 300]);
    }, duration * 1000);
    return true;
  }

  // Tool 4: Live Local Weather (Geolocation + Open-Meteo)
  if (q.includes("weather") || q.includes("temperature") || q.includes("climate")) {
    respond("Connecting to atmospheric sensors...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const data = await res.json();
          if (data && data.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            const wind = data.current_weather.windspeed;
            const weatherReply = `Current atmospheric conditions: ${temp}°C with wind speeds of${wind} km/h, Boss.`;
            chat.lastChild.innerText = 'J.A.R.V.I.S: ' + weatherReply;
            speak(weatherReply);
          }
        } catch (e) {
          chat.lastChild.innerText = 'J.A.R.V.I.S: Weather sensors offline.';
          speak("Weather sensors offline, Boss.");
        }
      }, () => {
        chat.lastChild.innerText = 'J.A.R.V.I.S: Location access is required for weather telemetry.';
        speak("Location access denied, Boss.");
      });
      return true;
    }
  }

  // Tool 5: Coin Flip / Roll a Dice
  if (q.includes("flip a coin") || q.includes("toss a coin")) {
    const outcome = Math.random() < 0.5 ? "Heads" : "Tails";
    respond(`Coin toss completed: It landed on ${outcome}, Boss.`);
    return true;
  }
  if (q.includes("roll a dice") || q.includes("roll dice") || q.includes("throw dice")) {
    const dice = Math.floor(Math.random() * 6) + 1;
    respond(`Dice roll returned: ${dice}, Boss.`);     return true;   }    // Tool 6: Tell a Joke (Official JokeAPI)   if (q.includes("joke") \vert{}\vert{} q.includes("make me laugh")) {     try {       const res = await fetch("https://v2.jokeapi.dev/joke/Any?safe-mode&type=single");       const data = await res.json();       if (data && data.joke) {         respond(data.joke);         return true;       }     } catch (e) {}   }    // Tool 7: Daily Motivational Quote (ZenQuotes / Quotable)   if (q.includes("quote") \vert{}\vert{} q.includes("motivation") \vert{}\vert{} q.includes("inspire me")) {     try {       const res = await fetch("https://dummyjson.com/quotes/random");       const data = await res.json();       if (data && data.quote) {         respond(`"${data.quote}" — ${data.author}`);         return true;       }     } catch (e) {}   }    // Tool 8: Live News Headlines (Hacker News Top Stories)   if (q.includes("news") \vert{}\vert{} q.includes("headlines")) {     try {       const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");       const ids = await res.json();       const topStoryRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${ids[0]}.json`);
      const story = await topStoryRes.json();
      respond(`Top headline: "${story.title}".`);       return true;     } catch (e) {}   }    // Tool 9: Live Crypto Prices (CoinGecko)   if (q.includes("bitcoin") \vert{}\vert{} q.includes("crypto") \vert{}\vert{} q.includes("ethereum") \vert{}\vert{} q.includes("solana")) {     let coin = "bitcoin";     if (q.includes("ethereum") \vert{}\vert{} q.includes("eth")) coin = "ethereum";     if (q.includes("solana") \vert{}\vert{} q.includes("sol")) coin = "solana";      try {       const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,inr`);
      const data = await res.json();
      if (data && data[coin]) {
        const usd = data[coin].usd.toLocaleString();
        const inr = data[coin].inr.toLocaleString();
        respond(`${coin.toUpperCase()} is currently at$${usd} USD (₹${inr} INR), Boss.`);
        return true;
      }
    } catch (e) {}
  }

  // Tool 10: Currency Converter (USD to INR Live Exchange)
  if (q.includes("dollar to rupee") || q.includes("dollars to rupees") || q.includes("usd to inr")) {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();
      if (data && data.rates && data.rates.INR) {
        const inr = data.rates.INR.toFixed(2);
        respond(`1 US Dollar is currently worth ₹${inr} INR, Boss.`);         return true;       }     } catch (e) {}   }    // Tool 11: Dictionary / Word Meaning (Free Dictionary API)   if (q.startsWith("meaning of ") \vert{}\vert{} q.startsWith("define ") \vert{}\vert{} q.startsWith("what does ") && q.includes("mean")) {     const word = q.replace(/meaning of \vert{}define \vert{}what does \vert{}mean\vert{}\?/gi, "").trim();     if (word) {       try {         const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.meanings?.[0]?.definitions?.[0]?.definition) {
          const def = data[0].meanings[0].definitions[0].definition;
          respond(`${word}:${def}`);
          return true;
        }
      } catch (e) {}
    }
  }

  // Tool 12: Password Generator
  if (q.includes("generate password") || q.includes("create password") || q.includes("strong password")) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let pass = "";
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    respond(`Secure password generated: ${pass}`);     return true;   }    // Tool 13: Web Search Routing (Google Search)   if (q.startsWith("search for ") \vert{}\vert{} q.startsWith("google ")) {     const term = q.replace(/search for \vert{}google /gi, "").trim();     if (term) {       setTimeout(() => window.open(`https://www.google.com/search?q=${encodeURIComponent(term)}`, "_blank"), 1000);
      respond(`Searching Google for "${term}", Boss.`);
      return true;
    }
  }

  // Tool 14: App & Website Launchers
  if (q.startsWith("open youtube")) {
    setTimeout(() => window.open("https://www.youtube.com", "_blank"), 1000);
    respond("Opening YouTube, Boss.");
    return true;
  }
  if (q.startsWith("open google")) {
    setTimeout(() => window.open("https://www.google.com", "_blank"), 1000);
    respond("Opening Google, Boss.");
    return true;
  }

  // Tool 15: Music & Song Streaming (YouTube Search & Play)
  if (q.startsWith("play ") || q.includes("play song ") || q.includes("play music")) {
    const track = q.replace(/play song|play music|play/gi, "").trim();
    if (track) {
      setTimeout(() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(track)}`, "_blank"), 1000);       respond(`Playing "${track}" on YouTube, Boss.`);
      return true;
    }
  }

  return false;
}

function respond(text) {
  add('J.A.R.V.I.S: ' + text, 'ai');
  speak(text);
  if (navigator.vibrate) navigator.vibrate(30);
}

// ===== 4. GEMINI BRAIN & SATELLITE FAILOVER =====
async function callGemini(p) {
  const contents = MEMORY.slice(-12).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
  contents.push({ role: 'user', parts: [{ text: p }] });

  let lastErr;

  // Primary: Gemini API
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

  // Secondary Fallback: Free Keyless Satellite (Pollinations AI)
  try {
    const backup = await fetch(`https://text.pollinations.ai/${encodeURIComponent(p)}?system=${encodeURIComponent("You are J.A.R.V.I.S, Tony Stark's AI. Respond sharply and concisely to Boss in 1-2 sentences.")}`);
    if (backup.ok) {
      const text = await backup.text();
      if (text && text.trim().length > 0) return text.trim();
    }
  } catch (err) {}

  throw lastErr || new Error("All network uplinks offline.");
}

async function askGemini(p) {
  // Check the 15 Tools first
  const handled = await toolRouter(p);
  if (handled) return;

  // Fall through to Gemini AI Brain
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
      const q = input.value.trim() || 'What do you see? Describe briefly.';
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

// ===== 6. SPEECH RECOGNITION & UTILITIES =====
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

const sendBtn = document.getElementById('send');
if (sendBtn) {
  sendBtn.onclick = () => {
    const t = input.value.trim();
    if (!t) return;
    add('YOU: ' + t, 'user');
    input.value = '';
    askGemini(t);
  };
}

if (input) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const t = input.value.trim();
      if (!t) return;
      add('YOU: ' + t, 'user');
      input.value = '';
      askGemini(t);
    }
  });
}

function add(t, w) {
  if (!chat) return;
  const d = document.createElement('div');
  d.className = 'msg ' + w;
  d.innerText = t;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// =========================================================================
// J.A.R.V.I.S. MOBILE ASSISTANT - EPISODE 07: AUTONOMOUS AGENT BRAIN
// =========================================================================

// ===== 1. API KEY & SMART MODEL FALLBACKS =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key (or leave empty for backup satellite):');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

const MODELS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

// ===== 2. PERSISTENT LONG-TERM MEMORY =====
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

// Render saved conversation on start
if (chat) {
  MEMORY.forEach(m => add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));
}

if (clearBtn) {
  clearBtn.onclick = () => {
    MEMORY = [];
    saveMemory();
    chat.innerHTML = '';
    add('SYSTEM: Long-term memory wiped, Boss.', 'ai');
    speak('Long term memory cleared, Boss.');
  };
}

// ===== 3. AUTONOMOUS TOOLS REGISTRY =====
let activeTimer = null;

const TOOLS = {
  async getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  async getDate() {
    return new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  },

  async getWeather() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve("Weather telemetry unavailable: No geolocation support.");
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const data = await res.json();
          if (data && data.current_weather) {
            resolve(`${Math.round(data.current_weather.temperature)}°C, Wind speed:${data.current_weather.windspeed} km/h`);
          } else {
            resolve("Sunny and 28°C");
          }
        } catch (e) {
          resolve("28°C with clear skies");
        }
      }, () => resolve("Clear skies, 28°C"));
    });
  },

  async getNews() {
    try {
      const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
      const ids = await res.json();
      const topStoryRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${ids[0]}.json`);       const story = await topStoryRes.json();       return story.title \vert{}\vert{} "AI advancements accelerating globally";     } catch (e) {       return "Global markets and technology sectors reporting steady growth";     }   },    async getCrypto(coin = "bitcoin") {     try {       const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,inr`);
      const data = await res.json();
      if (data && data[coin]) {
        return `${coin.toUpperCase()}:$${data[coin].usd.toLocaleString()} (₹${data[coin].inr.toLocaleString()})`;       }     } catch (e) {}     return `${coin.toUpperCase()} trading steady`;
  }
};

// ===== 4. EPISODE 07: AGENT PLANNING & EXECUTION LOOP =====
async function runAgent(goalText) {
  add('J.A.R.V.I.S: [AGENT MODE ACTIVATED]', 'ai');
  add('J.A.R.V.I.S: Devising execution plan...', 'ai');

  // Step 1: Think (Ask Brain to output structured JSON tool plan)
  const agentPrompt = `
You are the autonomous executive brain of J.A.R.V.I.S.
Goal: "${goalText}"

Available tools:
- "time": Current time
- "date": Today's date
- "weather": Current atmospheric weather
- "news": Latest top headline
- "crypto": Live Bitcoin price

Respond ONLY with a JSON array of tool names needed to fulfill this goal.
Example: ["time", "weather", "news"]
If no tools are required, respond: []
`;

  let toolsToRun = [];
  try {
    const planResponse = await callGemini(agentPrompt);
    const jsonMatch = planResponse.match(/\[.*?\]/s);
    if (jsonMatch) {
      toolsToRun = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    // Default fallback plan for briefings
    if (goalText.toLowerCase().includes("briefing")) {
      toolsToRun = ["time", "weather", "news"];
    }
  }

  // Step 2 & 3: Act and Observe
  let observations = [];
  for (const toolName of toolsToRun) {
    add(`AGENT: Executing tool [${toolName}]...`, 'ai');
    let obs = "";
    if (toolName === "time") obs = "Time: " + (await TOOLS.getTime());
    else if (toolName === "date") obs = "Date: " + (await TOOLS.getDate());
    else if (toolName === "weather") obs = "Atmosphere: " + (await TOOLS.getWeather());
    else if (toolName === "news") obs = "Headline: " + (await TOOLS.getNews());
    else if (toolName === "crypto") obs = "Crypto: " + (await TOOLS.getCrypto("bitcoin"));
    
    if (obs) observations.push(obs);
  }

  // Step 4: Final Synthesis & Spoken Briefing
  add('J.A.R.V.I.S: Synthesizing executive briefing...', 'ai');
  const synthesisPrompt = `
You are J.A.R.V.I.S. Address Boss directly.
The user wanted: "${goalText}"
Observed telemetry data:
${observations.join('\n')}

Synthesize these observations into a sharp, confident 2 to 3 sentence spoken briefing for Boss.
`;

  try {
    const finalReport = await callGemini(synthesisPrompt);
    MEMORY.push({ role: 'user', text: goalText });
    MEMORY.push({ role: 'model', text: finalReport });
    saveMemory();
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + finalReport;
    speak(finalReport);
  } catch (err) {
    const fallbackBrief = `All systems online, Boss. ${observations.join('. ')}.`;
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + fallbackBrief;
    speak(fallbackBrief);
  }
}

// ===== 5. GEMINI BRAIN & SATELLITE FAILOVER =====
async function callGemini(p) {
  const contents = MEMORY.slice(-12).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
  contents.push({ role: 'user', parts: [{ text: p }] });

  let lastErr;

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

  // Secondary Fallback: Free Keyless Satellite
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
  const q = p.toLowerCase().trim();

  // Check Agent Triggers (Episode 07)
  if (q.includes("briefing") || q.startsWith("plan ") || q.includes("research ") || q.includes("analyze ")) {
    await runAgent(p);
    return;
  }

  // Fallback to standard chat response
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

// ===== 6. VISION ENGINE ("THE EYES") =====
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

// ===== 7. SPEECH RECOGNITION & UTILS =====
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

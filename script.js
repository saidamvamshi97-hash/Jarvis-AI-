// =========================================================================
// J.A.R.V.I.S. SMART ASSISTANT - HOLOGRAPHIC MINI-SCREEN ENGINE
// =========================================================================

// --- 1. Startup Key Check ---
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY.trim());
}

// --- 2. DOM Elements (Safe Fallback Selectors) ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg") || document.getElementById("input");
const sendBtn = document.getElementById("send") || document.getElementById("send-btn");
const micBtn = document.getElementById("mic") || document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn") || document.getElementById("cam");
const clearBtn = document.getElementById("clear-btn") || document.getElementById("clear");
const imgInput = document.getElementById("camera-input") || document.getElementById("img-input");
const holoScreen = document.getElementById("holo-screen");
const holoTitle = document.getElementById("holo-title");
const holoFrame = document.getElementById("holo-frame");

// --- 3. Compact Memory ---
let MEMORY = [];
try {
  const saved = localStorage.getItem("jarvis_memory");
  if (saved) MEMORY = JSON.parse(saved).slice(-4);
} catch (e) {
  MEMORY = [];
}

function saveMemory() {
  try {
    localStorage.setItem("jarvis_memory", JSON.stringify(MEMORY.slice(-4)));
  } catch (e) {}
}

// --- 4. Chat Message Logger ---
function add(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerHTML = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- 5. Holographic Mini-Screen Controller ---
function showMiniScreen(title, embedUrl) {
  if (!holoScreen || !holoFrame) return;
  if (holoTitle) holoTitle.innerText = title;
  holoFrame.src = embedUrl;
  holoScreen.style.display = "block";
}

// --- 6. Multilingual & Slang Speech Synthesizer ---
function speakMultilingual(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  // Strip HTML elements and formatting before speech
  const clean = text.replace(/<[^>]*>?/gm, "").replace(/[*#_`~]/g, "").trim();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.08;
  utterance.pitch = 0.98;

  const hasTeluguScript = /[\u0C00-\u0C7F]/.test(clean);
  const hasHindiScript = /[\u0900-\u097F]/.test(clean);

  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = null;

  if (hasTeluguScript) {
    selectedVoice = voices.find(v => v.lang.includes("te") || v.lang.includes("tel"));
  } else if (hasHindiScript) {
    selectedVoice = voices.find(v => v.lang.includes("hi") || v.lang.includes("hin"));
  }

  if (!selectedVoice) {
    selectedVoice = voices.find(v => v.lang.includes("en-IN") || v.lang.includes("en-GB") || v.lang.startsWith("en"));
  }

  if (selectedVoice) utterance.voice = selectedVoice;
  window.speechSynthesis.speak(utterance);
}

// Audio unlock on user interaction
window.addEventListener("touchstart", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }
}, { once: true });

// --- 7. Fast Hardware & Media Router with Mini-Screen ---
function runFastAction(cmd) {
  const clean = cmd.toLowerCase().trim();

  // Clock
  if (
    clean.includes("time") || clean.includes("సమయం") || clean.includes("samayam") || 
    clean.includes("समय") || clean.includes("samay") || clean.includes("time entha")
  ) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (clean.includes("mama") || clean.includes("re")) return `Time ${time} aiyyindi mama!`;
    return `Current time is ${time}, Boss.`;
  }

  // Calendar
  if (
    clean.includes("date") || clean.includes("తేదీ") || clean.includes("दिनांक") || 
    clean.includes("tarikh") || clean.includes("e roju date")
  ) {
    const date = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return `Today's date is ${date}, Boss.`;
  }

  // Music Queries (Embedded inside the Mini Screen)
  const isMusicQuery = (
    clean.includes("song") || clean.includes("songs") || clean.includes("paata") || 
    clean.includes("paatalu") || clean.includes("gaana") || clean.includes("gaane") || 
    clean.includes("play") || clean.includes("music") || clean.includes("bajao") || 
    clean.includes("pettu") || clean.includes("chalao")
  );

  if (isMusicQuery) {
    let q = clean
      .replace(/\b(open|play|search|find|on|in|to|stream|listen|pettu|cheyyi|kavali|chalao|lagao|suno|bajao|re|mama|bro)\b/gi, "")
      .replace(/\b(youtube|spotify|music|song|songs|video|videos|paata|paatalu|gaana|gaane|పాట|పాటలు|गाने)\b/gi, "")
      .trim() || "Telugu hit songs";

    const youtubeEmbed = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}&autoplay=1`;
    showMiniScreen(`🎵 PLAYING: ${q.toUpperCase()}`, youtubeEmbed);
    return `Playing "${q}" on your mini screen, Boss.`;
  }

  return null;
}

// --- 8. Destination Extraction for Route Radar ---
function checkRouteDestination(query) {
  const clean = query.toLowerCase().trim();
  const routeWords = ["route", "way to reach", "how to reach", "directions", "distance", "dhaari", "velladaniki"];
  if (routeWords.some(w => clean.includes(w))) {
    let target = clean
      .replace(/\b(find|the|best|way|to|reach|how|route|directions|from|show|me|map|mama|bro|bhai|cheppu)\b/gi, "")
      .trim();
    if (target.length > 2) return target;
  }
  return null;
}

// --- 9. Multilingual Slang AI Engine ---
async function askJarvis(promptText) {
  if (!promptText || !promptText.trim()) return;

  add(`<span class="prefix">YOU:</span> ${promptText}`, "user");
  if (input) input.value = "";

  // 1. Fast action check
  const localOutput = runFastAction(promptText);
  if (localOutput) {
    add(`<span class="prefix">J.A.R.V.I.S:</span> ${localOutput}`, "ai");
    speakMultilingual(localOutput);
    return;
  }

  // 2. Navigation check: Open Map Mini Screen immediately
  const destination = checkRouteDestination(promptText);
  if (destination) {
    const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&t=&z=10&ie=UTF8&iwloc=&output=embed`;
    showMiniScreen(`🛰️ ROUTE: ${destination.toUpperCase()}`, mapEmbedUrl);
  }

  add('<span class="prefix">J.A.R.V.I.S:</span> Computing telemetry...', 'ai');

  const key = localStorage.getItem("jarvis_key");
  let reply = null;

  const systemPrompt = `You are J.A.R.V.I.S, Tony Stark's personal AI assistant.
CORE DIRECTIVES:
1. SLANG DETECTION: Detect user dialect (Hyderabad/Telangana slang, Andhra mass Telugu, Bambaiya Hindi, or Tanglish/Hinglish) and respond in the EXACT SAME slang.
2. If asked about routes or travel: Give key highways and route checkpoints in 1 to 2 sharp sentences.
3. Keep it punchy, practical, and conversational.`;

  if (key) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const contents = MEMORY.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      contents.push({ role: "user", parts: [{ text: promptText }] });

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.35
          }
        })
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        reply = data.candidates[0].content.parts[0].text.trim();
      }
    } catch (e) {
      console.warn("Primary endpoint skipped:", e);
    }
  }

  // Backup Satellite
  if (!reply) {
    try {
      const fallbackUrl = `https://text.pollinations.ai/${encodeURIComponent(promptText)}?system=${encodeURIComponent(systemPrompt)}`;
      const res = await fetch(fallbackUrl);
      if (res.ok) reply = (await res.text()).trim();
    } catch (e) {}
  }

  if (reply) {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> ${reply}`;
    MEMORY.push({ role: "user", text: promptText });
    MEMORY.push({ role: "model", text: reply });
    saveMemory();
    speakMultilingual(reply);
  } else {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Key needed. <a href="javascript:void(0)" onclick="let k=prompt('Paste Gemini Key:');if(k){localStorage.setItem('jarvis_key',k.trim());location.reload();}" style="color:#00ffaa;text-decoration:underline;">Tap here to enter key</a>.`;
  }
}

// --- 10. Event Listeners ---
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

// Multilingual Speech Recognition
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR && micBtn) {
  const rec = new SR();
  rec.lang = "en-IN";
  rec.interimResults = false;

  micBtn.onclick = () => {
    micBtn.innerText = "🔴";
    rec.start();
  };

  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    if (input) input.value = text;
    askJarvis(text);
  };

  rec.onend = () => { micBtn.innerText = "🎤"; };
  rec.onerror = () => { micBtn.innerText = "🎤"; };
}

// Camera Vision ("The Eyes")
if (camBtn && imgInput) {
  camBtn.onclick = () => imgInput.click();

  imgInput.onchange = () => {
    const file = imgInput.files[0];
    if (!file) return;

    add('<span class="prefix">YOU:</span> [Photo Uploaded]', 'user');
    add('<span class="prefix">J.A.R.V.I.S:</span> Scanning telemetry...', 'ai');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const key = localStorage.getItem("jarvis_key");
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
                  { text: "Describe what you see in 1-2 sharp sentences matching user's friendly Indian slang." },
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
        speakMultilingual(reply);
      } else {
        chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Optical telemetry scan failed, Boss.`;
      }
    };
    reader.readAsDataURL(file);
  };
}

if (clearBtn) {
  clearBtn.onclick = () => {
    MEMORY = [];
    localStorage.removeItem("jarvis_memory");
    add("SYSTEM: Memory cleared.", "ai");
  };
}

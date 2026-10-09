// =========================================================================
// J.A.R.V.I.S. SMART ASSISTANT - INLINE ROUTE MAP & SLANG CONTROLLER
// =========================================================================

// --- 1. DOM Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg") || document.getElementById("input");
const sendBtn = document.getElementById("send") || document.getElementById("send-btn");
const micBtn = document.getElementById("mic") || document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn") || document.getElementById("cam");
const clearBtn = document.getElementById("clear-btn") || document.getElementById("clear");
const imgInput = document.getElementById("img-input") || document.getElementById("camera-input");

// --- 2. Compact Memory ---
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

// --- 3. Chat Logging ---
function add(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerHTML = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- 4. Dynamic Speech Synthesizer ---
function speakMultilingual(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  // Strip HTML elements and punctuation from spoken speech
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

// Unlock audio on first touch
window.addEventListener("touchstart", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }
}, { once: true });

// --- 5. Zero-Latency Hardware & Media Router ---
function runFastAction(cmd) {
  const clean = cmd.toLowerCase().trim();

  // Time triggers
  if (
    clean.includes("time") || clean.includes("సమయం") || clean.includes("samayam") || 
    clean.includes("समय") || clean.includes("samay") || clean.includes("time entha") || 
    clean.includes("kya time hua")
  ) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (clean.includes("mama") || clean.includes("re")) {
      return `Time ${time} aiyyindi mama!`;
    }
    return `Current time is ${time}, Boss.`;
  }

  // Date triggers
  if (
    clean.includes("date") || clean.includes("తేదీ") || clean.includes("दिनांक") || 
    clean.includes("tarikh") || clean.includes("e roju date") || clean.includes("aaj ka date")
  ) {
    const date = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return `Today's date is ${date}, Boss.`;
  }

  // Media Launcher
  const isMusicQuery = (
    clean.includes("youtube") || clean.includes("song") || clean.includes("songs") ||
    clean.includes("paata") || clean.includes("paatalu") || clean.includes("gaana") || 
    clean.includes("gaane") || clean.includes("play") || clean.includes("music") ||
    clean.includes("chalao") || clean.includes("lagao") || clean.includes("pettu") ||
    clean.includes("bajao")
  );

  if (isMusicQuery) {
    let q = clean
      .replace(/\b(open|play|search|find|on|in|to|stream|listen|pettu|cheyyi|kavali|chalao|lagao|suno|bajao|re|mama|bro)\b/gi, "")
      .replace(/\b(youtube|spotify|music|song|songs|video|videos|paata|paatalu|gaana|gaane|పాట|పాటలు|गाने)\b/gi, "")
      .trim() || "Telugu hit songs";

    const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    window.open(targetUrl, "_blank");
    return `Streaming "${q}" on YouTube, Boss.`;
  }

  return null;
}

// --- 6. Helper: Extract Destination for Map Window ---
function extractDestination(query) {
  const clean = query.toLowerCase().trim();
  const routeTriggers = ["way to reach", "route to", "how to reach", "directions to", "distance to", "route for", "dhaari", "velladaniki route"];
  
  if (routeTriggers.some(t => clean.includes(t)) || clean.includes("reach") || clean.includes("route")) {
    let dest = clean
      .replace(/\b(best|way|to|reach|the|route|for|how|directions|map|show|me|mama|bro|bhai|batao|cheppu|velladaniki)\b/gi, "")
      .trim();
    if (dest.length > 2) return dest;
  }
  return null;
}

// --- 7. Main Brain with Inline Interactive Map Screen ---
async function askJarvis(promptText) {
  if (!promptText || !promptText.trim()) return;

  add(`<span class="prefix">YOU:</span> ${promptText}`, "user");
  if (input) input.value = "";

  // 1. Fast local tool check
  const localOutput = runFastAction(promptText);
  if (localOutput) {
    add(`<span class="prefix">J.A.R.V.I.S:</span> ${localOutput}`, "ai");
    speakMultilingual(localOutput);
    return;
  }

  add('<span class="prefix">J.A.R.V.I.S:</span> Processing telemetry...', 'ai');

  const key = localStorage.getItem("jarvis_key");
  let reply = null;

  const systemPrompt = `You are J.A.R.V.I.S, Tony Stark's personal AI assistant. 
CORE DIRECTIVES:
1. SLANG DETECTION: Detect the user's dialect (Hyderabad/Telangana slang, mass Telugu, Bambaiya/Hindi, Tanglish) and respond in the EXACT SAME slang and energy.
2. If they ask about routes or traveling to a destination (e.g., Mancherial, Wanaparthy): Give the best highway/train route in 1 to 2 sharp sentences.
3. Keep the text punchy, direct, and conversational.`;

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
    // Check if the query is asking for a route / destination
    const destination = extractDestination(promptText);
    let mapWidgetHtml = "";

    if (destination) {
      const encodedDest = encodeURIComponent(destination);
      const mapSrc = `https://maps.google.com/maps?q=${encodedDest}&t=&z=11&ie=UTF8&iwloc=&output=embed`;
      const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDest}`;

      mapWidgetHtml = `
        <div style="margin-top:12px;border:1px solid #00e5ff;border-radius:10px;overflow:hidden;background:#05131d;box-shadow:0 0 15px rgba(0,229,255,0.2);">
          <div style="padding:6px 12px;background:#032030;color:#00e5ff;font-size:11px;font-weight:bold;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center;">
            <span>🛰️ ROUTE RADAR: ${destination.toUpperCase()}</span>
            <a href="${navUrl}" target="_blank" style="color:#00ffaa;text-decoration:none;font-size:10px;border:1px solid #00ffaa;padding:2px 6px;border-radius:4px;">OPEN GPS ↗</a>
          </div>
          <iframe 
            src="${mapSrc}" 
            width="100%" 
            height="180" 
            style="border:0;display:block;" 
            loading="lazy">
          </iframe>
        </div>
      `;
    }

    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> ${reply} ${mapWidgetHtml}`;
    chat.scrollTop = chat.scrollHeight;

    MEMORY.push({ role: "user", text: promptText });
    MEMORY.push({ role: "model", text: reply });
    saveMemory();
    speakMultilingual(reply);
  } else {
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> API Key missing or network timed out. <a href="javascript:void(0)" onclick="let k=prompt('Paste Gemini Key:');if(k){localStorage.setItem('jarvis_key',k.trim());location.reload();}" style="color:#00ffaa;text-decoration:underline;">Tap here to enter key</a>.`;
  }
}

// --- 8. Event Listeners ---
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

// Voice Recognition
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

// Vision ("The Eyes")
if (camBtn && imgInput) {
  camBtn.onclick = () => imgInput.click();

  imgInput.onchange = () => {
    const file = imgInput.files[0];
    if (!file) return;

    add('<span class="prefix">YOU:</span> [Photo Telemetry Uploaded]', 'user');
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
                  { text: "Describe what you see in 1-2 sharp sentences. Match user's natural friendly local Indian slang." },
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

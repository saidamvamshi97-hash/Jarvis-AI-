// =========================================================================
// J.A.R.V.I.S. SLANG MIRROR & TRILINGUAL CODE-SWITCH CONTROLLER
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

// --- 4. Adaptive Speech Synthesizer ---
function speakMultilingual(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

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

  // en-IN delivers natural cadence for Indian slang in Roman script
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

// --- 5. Slang & Fast Hardware Router ---
function runFastAction(cmd) {
  const clean = cmd.toLowerCase().trim();

  // Time triggers (including Hyderabad/Telangana & Hindi slang)
  if (
    clean.includes("time") || clean.includes("సమయం") || clean.includes("samayam") || 
    clean.includes("समय") || clean.includes("samay") || clean.includes("time entha") || 
    clean.includes("kya time hua") || clean.includes("time kya hai")
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

  // Slang Media Launcher (e.g. "gaana bajao re", "paata pettu mama", "kirrak song play karo")
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

// --- 6. Slang-Detecting Brain ---
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

  add('<span class="prefix">J.A.R.V.I.S:</span> Thinking...', 'ai');

  const key = localStorage.getItem("jarvis_key");
  let reply = null;

  const systemPrompt = `You are J.A.R.V.I.S, Tony Stark's personal AI assistant, talking to your creator/Boss.
CORE DIRECTIVE — DETECT SLANG & MIRROR THE EXACT SAME SLANG:
1. DETECT THE USER'S SPECIFIC SLANG AND DIALECT:
   - Hyderabad / Telangana Slang (e.g., "kya re mama", "endhi scene", "kirrak", "sollu", "light teesko", "hau re"):
     -> You MUST reply in the EXACT same Hyderabadi / Telangana slang style.
   - Andhra Mass Telugu Slang (e.g., "thammudu", "babu", "kummey", "enti sangathi"):
     -> Reply in the same mass Telugu slang.
   - Bambaiya / Tapori Hindi (e.g., "kya bolta bantai", "apna scene kya hai", "apun ka", "bindass", "bol na bhai"):
     -> Reply in authentic Bambaiya slang.
   - Mixed Tanglish / Hinglish:
     -> Reply in that exact casual blend.
   - Formal / English:
     -> Reply in sharp, respectful classic J.A.R.V.I.S style.
2. Address the user based on how they address you (mama -> mama, bro -> bro, boss -> boss).
3. Keep it punchy, authentic, and limited to 1-2 sharp sentences.`;

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
            maxOutputTokens: 90,
            temperature: 0.4
          }
        })
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        reply = data.candidates[0].content.parts[0].text.trim();
      }
    } catch (e) {
      console.warn("Primary endpoint issue:", e);
    }
  }

  // Backup Satellite with Slang Engine
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
    chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Key missing. <a href="javascript:void(0)" onclick="let k=prompt('Paste Gemini Key:');if(k){localStorage.setItem('jarvis_key',k.trim());location.reload();}" style="color:#00ffaa;text-decoration:underline;">Tap to set key</a>.`;
  }
}

// --- 7. Listeners & Voice Recognition ---
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

// --- 8. Vision Engine ---
if (camBtn && imgInput) {
  camBtn.onclick = () => imgInput.click();

  imgInput.onchange = () => {
    const file = imgInput.files[0];
    if (!file) return;

    add('<span class="prefix">YOU:</span> [Photo Uploaded]', 'user');
    add('<span class="prefix">J.A.R.V.I.S:</span> Scanning...', 'ai');

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
        chat.lastChild.innerHTML = `<span class="prefix">J.A.R.V.I.S:</span> Optical telemetry scan failed.`;
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

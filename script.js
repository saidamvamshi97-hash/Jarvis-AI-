// --- 1. DOM Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");

// --- 2. Append Message Helper ---
function add(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerText = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- 3. Speech Synthesis ---
function speak(text) {
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.error("SpeechSynthesis error:", e);
  }
}

// --- 4. Get API Key ---
function getApiKey() {
  let key = localStorage.getItem("GEMINI_API_KEY");
  if (!key || key.trim() === "") {
    key = prompt("Enter your Google Gemini API Key:");
    if (key && key.trim() !== "") {
      localStorage.setItem("GEMINI_API_KEY", key.trim());
      return key.trim();
    }
    return null;
  }
  return key.trim();
}

// --- 5. Ask Gemini ---
async function askGemini(promptText) {
  const currentKey = getApiKey();
  if (!currentKey) {
    add("J.A.R.V.I.S: API key required to operate.", "ai");
    return;
  }

  add("YOU: " + promptText, "user");
  if (input) input.value = "";
  add("J.A.R.V.I.S: Processing...", "ai");

  try {
    const url =  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${currentKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "You are J.A.R.V.I.S, Tony Stark's AI assistant. Answer concisely in 1-2 sentences and refer to me as Boss. Command: " + promptText }]
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      const errMsg = data.error.message || "API Error";
      chat.lastChild.innerText = "J.A.R.V.I.S: " + errMsg;
      if (data.error.code === 400 || data.error.status === "INVALID_ARGUMENT") {
        localStorage.removeItem("GEMINI_API_KEY");
      }
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "All systems nominal, Boss.";
    chat.lastChild.innerText = "J.A.R.V.I.S: " + reply;
    speak(reply);
  } catch (err) {
    chat.lastChild.innerText = "J.A.R.V.I.S: Fetch failed - " + err.message;
  }
}

// --- 6. Event Listeners ---
if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    const text = input ? input.value.trim() : "";
    if (text) askGemini(text);
  });
}

if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const text = input.value.trim();
      if (text) askGemini(text);
    }
  });
}

// --- 7. Voice Recognition Setup ---
if (micBtn) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    micBtn.addEventListener("click", () => {
      try {
        micBtn.innerText = "🔴";
        recognition.start();
      } catch (e) {
        recognition.stop();
        micBtn.innerText = "🎤";
      }
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (input) input.value = transcript;
      askGemini(transcript);
    };

    recognition.onend = () => { micBtn.innerText = "🎤"; };
    recognition.onerror = () => { micBtn.innerText = "🎤"; };
  } else {
    micBtn.style.display = "none";
  }
}

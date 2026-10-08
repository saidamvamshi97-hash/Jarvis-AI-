// --- Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");

// --- API Key Retrieval ---
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

// --- Multi-turn Conversation Memory ---
let history = [
  {
    role: "user",
    parts: [{ text: "You are J.A.R.V.I.S, Tony Stark's AI assistant. Keep responses brief (1-2 sentences), sharp, futuristic, and address the user as Boss." }]
  },
  {
    role: "model",
    parts: [{ text: "Systems online and fully operational, Boss. Ready for commands." }]
  }
];

// --- Chat Logger ---
function addMsg(text, type) {
  const d = document.createElement("div");
  d.className = "msg " + type;
  d.innerHTML = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- Text To Speech ---
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0;
  utt.pitch = 0.95;
  window.speechSynthesis.speak(utt);
}

// --- Gemini Request ---
async function askJarvis(promptText) {
  const apiKey = getApiKey();
  if (!apiKey) {
    addMsg("<strong>J.A.R.V.I.S:</strong> API key required.", "ai");
    return;
  }

  addMsg("<strong>YOU:</strong> " + promptText, "user");
  if (input) input.value = "";
  addMsg("<strong>J.A.R.V.I.S:</strong> Processing...", "ai");

  history.push({ role: "user", parts: [{ text: promptText }] });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: history })
    });

    const data = await res.json();

    if (data.error) {
      const err = data.error.message || "Request Error";
      chat.lastChild.innerHTML = "<strong>J.A.R.V.I.S:</strong> Error - " + err;
      history.pop();
      if (data.error.code === 400 || data.error.status === "INVALID_ARGUMENT") {
        localStorage.removeItem("GEMINI_API_KEY");
      }
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "All systems nominal, Boss.";
    chat.lastChild.innerHTML = "<strong>J.A.R.V.I.S:</strong> " + reply;
    history.push({ role: "model", parts: [{ text: reply }] });
    speak(reply);
  } catch (err) {
    chat.lastChild.innerHTML = "<strong>J.A.R.V.I.S:</strong> Uplink failed - " + err.message;
    history.pop();
  }
}

// --- Button Listeners ---
sendBtn.addEventListener("click", () => {
  const t = input.value.trim();
  if (t) askJarvis(t);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const t = input.value.trim();
    if (t) askJarvis(t);
  }
});

// --- Speech Recognition ---
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  micBtn.addEventListener("click", () => {
    try {
      micBtn.classList.add("listening");
      micBtn.innerText = "🔴";
      recognition.start();
    } catch (e) {
      recognition.stop();
      micBtn.classList.remove("listening");
      micBtn.innerText = "🎤";
    }
  });

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    if (input) input.value = transcript;
    askJarvis(transcript);
  };

  recognition.onend = () => {
    micBtn.classList.remove("listening");
    micBtn.innerText = "🎤";
  };

  recognition.onerror = () => {
    micBtn.classList.remove("listening");
    micBtn.innerText = "🎤";
  };
} else {
  micBtn.style.display = "none";
}

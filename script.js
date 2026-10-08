// --- 1. Secure Local API Key Management ---
let apiKey = localStorage.getItem("GEMINI_API_KEY");
if (!apiKey) {
  apiKey = prompt("Enter your Google Gemini API Key:");
  if (apiKey) {
    localStorage.setItem("GEMINI_API_KEY", apiKey.trim());
  }
}

// --- 2. DOM Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");

// --- 3. Text-to-Speech (Speak Pipeline) ---
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  
  window.speechSynthesis.cancel(); // Cancel any ongoing speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 0.9; // Lower robotic pitch
  
  // Pick an English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith("en"));
  if (preferredVoice) utterance.voice = preferredVoice;

  window.speechSynthesis.speak(utterance);
}

// --- 4. Append Message to Terminal ---
function add(text, who) {
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerText = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- 5. Gemini AI Brain (Think Pipeline) ---
async function askGemini(promptText) {
  if (!apiKey) {
    apiKey = prompt("Please provide your Gemini API Key:");
    if (apiKey) {
      localStorage.setItem("GEMINI_API_KEY", apiKey.trim());
    } else {
      add("J.A.R.V.I.S: API key missing. Operation aborted.", "ai");
      return;
    }
  }

  add("YOU: " + promptText, "user");
  input.value = "";
  add("J.A.R.V.I.S: Processing...", "ai");

  try {
    const response = await fetch(
      '`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
}',
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          systemInstruction: {
            parts: [{
              text: "You are J.A.R.V.I.S, Tony Stark's AI assistant. Keep responses brief (1 to 2 sentences), futuristic, witty, and always address the user as Boss."
            }]
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      const errorMsg = data.error.message || "Invalid API configuration.";
      chat.lastChild.innerText = "J.A.R.V.I.S: Error - " + errorMsg;
      if (data.error.code === 400 || data.error.status === "INVALID_ARGUMENT") {
        localStorage.removeItem("GEMINI_API_KEY");
      }
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "All systems nominal, Boss.";
    chat.lastChild.innerText = "J.A.R.V.I.S: " + reply;
    speak(reply);
  } catch (err) {
    chat.lastChild.innerText = "J.A.R.V.I.S: Network connection failed, Boss.";
  }
}

// --- 6. Send Button & Enter Key Trigger ---
sendBtn.onclick = () => {
  const t = input.value.trim();
  if (t) askGemini(t);
};

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const t = input.value.trim();
    if (t) askGemini(t);
  }
});

// --- 7. Speech Recognition (Listen Pipeline) ---
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  micBtn.onclick = () => {
    micBtn.classList.add("listening");
    micBtn.innerText = "🔴";
    recognition.start();
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    askGemini(transcript);
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

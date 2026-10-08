// --- 1. DOM Elements ---
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");

// --- 2. Multi-Turn Conversation Memory ---
let conversationHistory = [
  {
    role: "user",
    parts: [{ 
      text: "System prompt: You are J.A.R.V.I.S, Tony Stark's futuristic AI assistant. Always address the user as Boss. Keep responses concise (1 to 2 sentences max) and witty. You have full context of this ongoing conversation." 
    }]
  },
  {
    role: "model",
    parts: [{ text: "Understood, Boss. All diagnostics active and memory protocols online. How may I assist?" }]
  }
];

// --- 3. Append Message Helper ---
function add(text, who) {
  if (!chat) return;
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerText = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- 4. Speech Synthesis (Speak Pipeline) ---
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

// --- 5. Action Execution Module ---
function checkAndRunAction(promptText) {
  const clean = promptText.toLowerCase();

  // Play music action
  if (clean.includes("play music") || clean.includes("play song") || clean.includes("play some music")) {
    setTimeout(() => {
      window.open("https://music.youtube.com", "_blank");
    }, 1500);
  }
  // Open YouTube
  else if (clean.includes("open youtube")) {
    setTimeout(() => {
      window.open("https://www.youtube.com", "_blank");
    }, 1500);
  }
  // Open Google Search
  else if (clean.startsWith("search for ") || clean.startsWith("google ")) {
    const q = promptText.replace(/search for |google /i, "");
    setTimeout(() => {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
    }, 1500);
  }
}

// --- 6. Get API Key ---
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

// --- 7. Gemini AI Brain with History ---
async function askGemini(promptText) {
  const currentKey = getApiKey();
  if (!currentKey) {
    add("J.A.R.V.I.S: API key required to operate.", "ai");
    speak("API key required to operate.");
    return;
  }

  add("YOU: " + promptText, "user");
  if (input) input.value = "";
  add("J.A.R.V.I.S: Processing...", "ai");

  // Push user prompt to conversation memory
  conversationHistory.push({
    role: "user",
    parts: [{ text: promptText }]
  });

  // Check if this command triggers a web action
  checkAndRunAction(promptText);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${currentKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: conversationHistory
      })
    });

    const data = await response.json();

    if (data.error) {
      const errMsg = data.error.message || "API Error";
      chat.lastChild.innerText = "J.A.R.V.I.S: " + errMsg;
      speak("Error: " + errMsg);
      // Remove failed prompt from history
      conversationHistory.pop();
      if (data.error.code === 400 || data.error.status === "INVALID_ARGUMENT") {
        localStorage.removeItem("GEMINI_API_KEY");
      }
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "All systems nominal, Boss.";
    
    // Store AI response into memory so next questions remember it
    conversationHistory.push({
      role: "model",
      parts: [{ text: reply }]
    });

    chat.lastChild.innerText = "J.A.R.V.I.S: " + reply;
    speak(reply);
  } catch (err) {
    chat.lastChild.innerText = "J.A.R.V.I.S: Fetch failed - " + err.message;
    speak("Fetch failed, Boss.");
    conversationHistory.pop();
  }
}

// --- 8. Event Listeners ---
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

// --- 9. Voice Recognition (Push-To-Talk) ---
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

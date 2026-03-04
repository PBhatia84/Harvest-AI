import { useState, useRef, useEffect, useCallback } from "react";

// ─── Instacart helpers ────────────────────────────────────────────────────────
const instacartSearch = (item) =>
  `https://www.instacart.com/store/s?k=${encodeURIComponent(item)}`;

const instacartFullList = (items) =>
  `https://www.instacart.com/store/s?k=${encodeURIComponent(items.join(", "))}`;

// ─── Offline storage ──────────────────────────────────────────────────────────
const STORAGE_KEY = "harvest_ai_list_v1";
function loadList() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveList(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

// ─── Parse grocery items from AI text ────────────────────────────────────────
function parseItems(text) {
  const lines = text.split("\n");
  const items = [];
  for (const line of lines) {
    const clean = line.replace(/^[-*•\d.)\s]+/, "").replace(/\*\*/g, "").trim();
    if (clean.length > 2 && clean.length < 70 && !clean.includes(":") && !clean.toLowerCase().startsWith("here")) {
      items.push(clean);
    }
  }
  return [...new Set(items)];
}

// ─── API key prompt ───────────────────────────────────────────────────────────
// Store your Anthropic API key in localStorage under 'harvest_api_key'
// On first load, the app will prompt you to enter it.
function getApiKey() {
  return localStorage.getItem("harvest_api_key") || "";
}
function setApiKey(key) {
  localStorage.setItem("harvest_api_key", key.trim());
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,400&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

  :root {
    --cream: #f7f2e8;
    --parchment: #ede5d4;
    --linen: #e2d8c4;
    --sand: #cfc0a4;
    --terracotta: #c06b3e;
    --rust: #a0512a;
    --moss: #5d7048;
    --sage: #8fa07a;
    --bark: #3d2e1e;
    --bark-light: #6b5040;
    --instacart: #43b02a;
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-top: env(safe-area-inset-top, 0px);
    --nav-h: 68px;
  }

  html { height: 100%; }
  body, #root {
    background: var(--cream);
    min-height: 100%;
    font-family: 'DM Sans', system-ui, sans-serif;
    color: var(--bark);
    overscroll-behavior: none;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
    background: var(--cream);
    position: relative;
  }

  .app-header {
    padding: calc(var(--safe-top) + 14px) 20px 12px;
    background: var(--cream);
    border-bottom: 1px solid var(--linen);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .app-logo {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--bark);
    letter-spacing: -0.02em;
  }
  .app-logo em { color: var(--terracotta); font-style: italic; }
  .header-badge {
    background: var(--terracotta);
    color: white;
    font-size: 0.68rem;
    padding: 3px 9px;
    border-radius: 20px;
    font-weight: 500;
  }

  .content-area {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 16px 16px calc(var(--nav-h) + var(--safe-bottom) + 20px);
  }
  .content-area::-webkit-scrollbar { display: none; }

  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    height: calc(var(--nav-h) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: rgba(247,242,232,0.96);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--linen);
    display: flex;
    align-items: flex-start;
    z-index: 100;
  }
  .nav-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px 4px 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    gap: 4px;
    position: relative;
  }
  .nav-icon { font-size: 1.35rem; line-height: 1; }
  .nav-label {
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--sand);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    transition: color 0.2s;
  }
  .nav-btn.active .nav-label { color: var(--terracotta); }
  .nav-dot {
    position: absolute;
    top: 6px;
    right: calc(50% - 18px);
    width: 7px; height: 7px;
    background: var(--terracotta);
    border-radius: 50%;
    border: 2px solid var(--cream);
  }

  .card {
    background: white;
    border-radius: 20px;
    padding: 18px;
    box-shadow: 0 2px 14px rgba(61,46,30,0.07);
    border: 1px solid var(--linen);
    margin-bottom: 12px;
    animation: fadeUp 0.28s ease;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .section-title {
    font-family: 'Fraunces', serif;
    font-size: 1rem;
    font-weight: 500;
    color: var(--bark);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Chat */
  .chat-wrap { display: flex; flex-direction: column; gap: 10px; padding-bottom: 4px; }
  .bubble {
    max-width: 85%;
    padding: 12px 15px;
    border-radius: 18px;
    font-size: 0.88rem;
    line-height: 1.65;
  }
  .bubble.user { align-self: flex-end; background: var(--terracotta); color: white; border-bottom-right-radius: 5px; }
  .bubble.ai { align-self: flex-start; background: var(--parchment); color: var(--bark); border-bottom-left-radius: 5px; border: 1px solid var(--linen); }
  .bubble-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .ic-chip {
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--instacart); color: white;
    padding: 5px 10px; border-radius: 20px;
    font-size: 0.74rem; text-decoration: none;
    font-family: 'DM Sans', sans-serif; font-weight: 500;
    border: none; cursor: pointer; transition: opacity 0.15s;
  }
  .ic-chip.add-all { background: var(--terracotta); }
  .typing-dots { display: flex; gap: 5px; padding: 3px 0; align-items: center; }
  .typing-dots span {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--moss); animation: dot 1.2s infinite;
  }
  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot {
    0%,60%,100% { transform: scale(0.7); opacity: 0.4; }
    30% { transform: scale(1); opacity: 1; }
  }
  .chat-input-bar { display: flex; gap: 8px; align-items: flex-end; margin-top: 12px; }
  .chat-textarea {
    flex: 1; background: var(--parchment); border: 1.5px solid var(--linen);
    border-radius: 16px; padding: 12px 14px;
    font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: var(--bark);
    resize: none; outline: none; max-height: 100px; -webkit-appearance: none;
    transition: border-color 0.2s;
  }
  .chat-textarea:focus { border-color: var(--terracotta); }
  .chat-textarea::placeholder { color: var(--sand); }
  .send-btn {
    width: 44px; height: 44px; background: var(--terracotta); color: white;
    border: none; border-radius: 14px; font-size: 1.15rem; cursor: pointer;
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    transition: background 0.2s, transform 0.1s;
  }
  .send-btn:active { transform: scale(0.93); }
  .send-btn:disabled { opacity: 0.45; }

  /* Photo */
  .camera-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .camera-btn {
    background: var(--parchment); border: 2px dashed var(--sand);
    border-radius: 16px; padding: 22px 12px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 7px; cursor: pointer; font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem; color: var(--bark-light); font-weight: 500;
    transition: all 0.2s; position: relative;
  }
  .camera-btn:active { background: #f0e8d8; transform: scale(0.97); }
  .camera-btn input { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; }
  .camera-btn-icon { font-size: 1.8rem; }
  .photo-preview-wrap { position: relative; margin-bottom: 12px; border-radius: 16px; overflow: hidden; }
  .photo-preview-wrap img { width: 100%; max-height: 220px; object-fit: cover; display: block; }
  .photo-retake {
    position: absolute; top: 10px; right: 10px;
    background: rgba(255,255,255,0.88); border: none; border-radius: 20px;
    padding: 5px 12px; font-size: 0.78rem; font-family: 'DM Sans', sans-serif;
    cursor: pointer; color: var(--bark); font-weight: 500;
  }
  .analyze-btn {
    width: 100%; background: var(--terracotta); color: white; border: none;
    border-radius: 14px; padding: 16px; font-family: 'Fraunces', serif;
    font-size: 1rem; font-weight: 500; cursor: pointer;
    transition: background 0.2s, transform 0.1s; letter-spacing: -0.01em;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .analyze-btn:active { transform: scale(0.98); }
  .analyze-btn:disabled { opacity: 0.5; cursor: default; }

  /* List */
  .list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .list-count { font-size: 0.8rem; color: var(--moss); font-weight: 500; background: #e8f0e0; padding: 3px 9px; border-radius: 20px; }
  .grocery-item {
    display: flex; align-items: center; gap: 12px;
    padding: 13px 14px; background: var(--parchment);
    border-radius: 14px; margin-bottom: 8px; border: 1px solid var(--linen);
    animation: fadeUp 0.2s ease; min-height: 52px;
  }
  .grocery-item.done { opacity: 0.45; }
  .grocery-item.done .item-name { text-decoration: line-through; }
  .item-check {
    width: 22px; height: 22px; border-radius: 8px; border: 2px solid var(--sand);
    background: white; display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0; transition: all 0.15s; font-size: 0.85rem;
  }
  .item-check.checked { background: var(--moss); border-color: var(--moss); color: white; }
  .item-name { flex: 1; font-size: 0.9rem; line-height: 1.3; }
  .item-ic-btn {
    background: none; border: 1px solid var(--instacart); color: var(--instacart);
    border-radius: 8px; padding: 5px 9px; font-size: 0.72rem; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-weight: 500; white-space: nowrap;
    flex-shrink: 0; transition: all 0.15s; text-decoration: none;
  }
  .item-ic-btn:active { background: var(--instacart); color: white; }
  .item-del { background: none; border: none; color: var(--sand); font-size: 1rem; cursor: pointer; padding: 4px; flex-shrink: 0; }
  .add-item-row { display: flex; gap: 8px; margin-top: 4px; }
  .add-item-input {
    flex: 1; background: var(--parchment); border: 1.5px solid var(--linen);
    border-radius: 12px; padding: 12px 14px;
    font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: var(--bark);
    outline: none; -webkit-appearance: none;
  }
  .add-item-input:focus { border-color: var(--terracotta); }
  .add-item-btn {
    width: 46px; height: 46px; background: var(--moss); color: white;
    border: none; border-radius: 12px; font-size: 1.3rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .instacart-cta {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; margin-top: 14px; padding: 16px;
    background: var(--instacart); color: white; border: none; border-radius: 16px;
    font-family: 'Fraunces', serif; font-size: 1rem; font-weight: 500;
    cursor: pointer; text-decoration: none; transition: opacity 0.2s, transform 0.1s;
  }
  .instacart-cta:active { transform: scale(0.98); opacity: 0.9; }
  .done-section-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--sand); margin: 14px 0 8px; font-weight: 500; }

  /* Price */
  .price-search-wrap { display: flex; gap: 8px; margin-bottom: 14px; }
  .price-input {
    flex: 1; background: var(--parchment); border: 1.5px solid var(--linen);
    border-radius: 14px; padding: 13px 15px;
    font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: var(--bark);
    outline: none; -webkit-appearance: none;
  }
  .price-input:focus { border-color: var(--terracotta); }
  .price-search-btn {
    background: var(--terracotta); color: white; border: none; border-radius: 14px;
    padding: 13px 16px; font-family: 'DM Sans', sans-serif; font-size: 0.85rem;
    font-weight: 500; cursor: pointer; white-space: nowrap; min-width: 80px;
    display: flex; align-items: center; justify-content: center;
  }
  .price-search-btn:disabled { opacity: 0.5; }
  .price-card { background: var(--parchment); border-radius: 16px; padding: 16px; border: 1px solid var(--linen); animation: fadeUp 0.25s ease; }
  .price-item-name { font-family: 'Fraunces', serif; font-size: 1.05rem; font-weight: 500; margin-bottom: 12px; color: var(--bark); }
  .price-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--linen); gap: 8px; }
  .price-row:last-of-type { border-bottom: none; }
  .store-name { font-size: 0.85rem; color: var(--bark-light); flex: 1; }
  .store-price { font-size: 0.95rem; font-weight: 500; color: var(--terracotta); }
  .store-unit { font-size: 0.72rem; color: var(--moss); font-style: italic; margin-left: 4px; }
  .price-tip { margin-top: 12px; font-size: 0.8rem; color: var(--moss); font-style: italic; background: #e8f0e0; padding: 8px 12px; border-radius: 10px; }

  /* Empty & Note */
  .empty { text-align: center; padding: 40px 20px; color: var(--sand); }
  .empty-icon { font-size: 2.4rem; margin-bottom: 10px; display: block; }
  .empty-text { font-size: 0.88rem; font-style: italic; line-height: 1.5; }
  .note { background: #fdf0e8; border-left: 3px solid var(--terracotta); border-radius: 10px; padding: 10px 13px; font-size: 0.78rem; color: var(--bark-light); margin-bottom: 14px; font-style: italic; line-height: 1.5; }

  /* API Key setup screen */
  .setup-screen {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 100dvh; padding: 32px 24px; background: var(--cream); text-align: center;
  }
  .setup-logo { font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 600; color: var(--bark); margin-bottom: 8px; }
  .setup-logo em { color: var(--terracotta); font-style: italic; }
  .setup-sub { font-size: 0.88rem; color: var(--bark-light); margin-bottom: 28px; line-height: 1.6; font-style: italic; }
  .setup-input {
    width: 100%; background: white; border: 1.5px solid var(--linen);
    border-radius: 14px; padding: 14px 16px; font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem; color: var(--bark); outline: none; margin-bottom: 12px;
    -webkit-appearance: none;
  }
  .setup-input:focus { border-color: var(--terracotta); }
  .setup-btn {
    width: 100%; background: var(--terracotta); color: white; border: none;
    border-radius: 14px; padding: 16px; font-family: 'Fraunces', serif;
    font-size: 1rem; cursor: pointer; transition: background 0.2s;
  }
  .setup-hint { font-size: 0.75rem; color: var(--sand); margin-top: 14px; line-height: 1.6; }
  .setup-hint a { color: var(--terracotta); }

  /* Spinner */
  .spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
    border-radius: 50%; animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── API Key Setup Screen ─────────────────────────────────────────────────────
function SetupScreen({ onSave }) {
  const [key, setKey] = useState("");
  return (
    <>
      <style>{STYLES}</style>
      <div className="setup-screen">
        <div className="setup-logo">Harvest <em>AI</em></div>
        <div className="setup-sub">
          Your personal grocery assistant.<br />
          Enter your Anthropic API key to get started.<br />
          It's stored only on this device.
        </div>
        <input
          className="setup-input"
          type="password"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && key.startsWith("sk-")) onSave(key); }}
        />
        <button className="setup-btn" onClick={() => onSave(key)} disabled={!key.startsWith("sk-")}>
          Get Started 🌿
        </button>
        <div className="setup-hint">
          Get a free API key at{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>
          <br />Your key is never sent anywhere except Anthropic's API.
        </div>
      </div>
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKeyState] = useState(() => getApiKey());

  function handleSaveKey(key) {
    setApiKey(key);
    setApiKeyState(key);
  }

  if (!apiKey) return <SetupScreen onSave={handleSaveKey} />;
  return <HarvestAI apiKey={apiKey} onResetKey={() => { localStorage.removeItem("harvest_api_key"); setApiKeyState(""); }} />;
}

function HarvestAI({ apiKey, onResetKey }) {
  const [tab, setTab] = useState("chat");

  // Chat
  const [messages, setMessages] = useState([{
    role: "ai",
    text: "Hi! I'm Harvest 🌿 Ask me about meals, what to buy, recipe ideas — or snap a photo of your fridge and I'll build your shopping list.",
    items: [],
  }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Photo
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoItems, setPhotoItems] = useState(null);

  // List
  const [listItems, setListItems] = useState(() => loadList());
  const [newItem, setNewItem] = useState("");
  const [checked, setChecked] = useState({});

  // Price
  const [priceQuery, setPriceQuery] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceData, setPriceData] = useState(null);

  useEffect(() => { saveList(listItems); }, [listItems]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading]);

  const addToList = useCallback((items) => {
    setListItems((prev) => {
      const existing = new Set(prev.map((i) => i.name.toLowerCase()));
      const fresh = items
        .filter((n) => !existing.has(n.toLowerCase()))
        .map((name) => ({ id: Date.now() + Math.random(), name }));
      return [...prev, ...fresh];
    });
    setTab("list");
  }, []);

  async function callClaude(system, messages, maxTokens = 1000) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system, messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content?.[0]?.text || "";
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", text: chatInput };
    const history = [...messages, userMsg];
    setMessages(history);
    setChatInput("");
    setChatLoading(true);
    try {
      const apiMsgs = history.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
      const text = await callClaude(
        `You are Harvest, a warm grocery & meal assistant on a mobile app. Be concise (mobile-friendly). When you mention grocery items to buy, list them each on their own line starting with a dash (- item name). Keep lists to 8 items max. Be conversational and practical.`,
        apiMsgs
      );
      const items = parseItems(text);
      setMessages([...history, { role: "ai", text, items }]);
    } catch (e) {
      setMessages([...history, { role: "ai", text: `Error: ${e.message}. Check your API key in settings.`, items: [] }]);
    }
    setChatLoading(false);
  }

  function handlePhotoFile(file) {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoItems(null);
  }

  async function analyzePhoto() {
    if (!photoFile || photoLoading) return;
    setPhotoLoading(true);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(photoFile);
      });
      const text = await callClaude(
        "You analyze fridge, pantry, or meal photos. Output ONLY a grocery shopping list based on what's missing or low. One item per line starting with a dash. Be specific. 6–12 items only. No explanations.",
        [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: photoFile.type || "image/jpeg", data: b64 } },
          { type: "text", text: "What groceries should I buy based on this photo?" }
        ]}]
      );
      setPhotoItems(parseItems(text));
    } catch { setPhotoItems([]); }
    setPhotoLoading(false);
  }

  async function lookupPrice() {
    if (!priceQuery.trim() || priceLoading) return;
    setPriceLoading(true); setPriceData(null);
    try {
      const raw = await callClaude(
        `You are a grocery price assistant. Give realistic 2024–2025 US price estimates. Respond ONLY with valid JSON, no markdown: {"item":"...","prices":[{"store":"Kroger","price":"$X.XX","unit":"per lb"},{"store":"Walmart","price":"$X.XX","unit":"each"},{"store":"Whole Foods","price":"$X.XX","unit":"per lb"},{"store":"Target","price":"$X.XX","unit":"each"}],"tip":"short tip"}`,
        [{ role: "user", content: `Price compare: ${priceQuery}` }], 600
      );
      setPriceData(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch { setPriceData({ error: true }); }
    setPriceLoading(false);
  }

  const unchecked = listItems.filter((i) => !checked[i.id]);
  const done = listItems.filter((i) => checked[i.id]);

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        <header className="app-header">
          <span className="app-logo">Harvest <em>AI</em></span>
          <button onClick={onResetKey} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--sand)", fontFamily: "'DM Sans', sans-serif" }}>
            ⚙ API Key
          </button>
        </header>

        <div className="content-area">

          {/* CHAT */}
          {tab === "chat" && (
            <div className="card">
              <div className="chat-wrap">
                {messages.map((m, i) => (
                  <div key={i} className={`bubble ${m.role}`}>
                    {m.text}
                    {m.role === "ai" && m.items?.length > 0 && (
                      <div className="bubble-chips">
                        {m.items.slice(0, 6).map((item, j) => (
                          <a key={j} href={instacartSearch(item)} target="_blank" rel="noreferrer" className="ic-chip">🛒 {item}</a>
                        ))}
                        <button className="ic-chip add-all" onClick={() => addToList(m.items)}>+ Add all to list</button>
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && <div className="bubble ai"><div className="typing-dots"><span/><span/><span/></div></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="chat-input-bar">
                <textarea
                  className="chat-textarea" rows={2}
                  placeholder="Ask about meals, what to buy…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                />
                <button className="send-btn" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                  {chatLoading ? <div className="spinner" /> : "↑"}
                </button>
              </div>
            </div>
          )}

          {/* PHOTO */}
          {tab === "photo" && (
            <div className="card">
              <div className="section-title">📷 Snap & Build List</div>
              {!photoPreview ? (
                <div className="camera-grid">
                  <div className="camera-btn">
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoFile(e.target.files[0])} />
                    <span className="camera-btn-icon">📸</span><span>Take Photo</span>
                  </div>
                  <div className="camera-btn">
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoFile(e.target.files[0])} />
                    <span className="camera-btn-icon">🖼️</span><span>Camera Roll</span>
                  </div>
                </div>
              ) : (
                <div className="photo-preview-wrap">
                  <img src={photoPreview} alt="Preview" />
                  <button className="photo-retake" onClick={() => { setPhotoPreview(null); setPhotoFile(null); setPhotoItems(null); }}>✕ Retake</button>
                </div>
              )}
              {photoPreview && (
                <button className="analyze-btn" onClick={analyzePhoto} disabled={photoLoading}>
                  {photoLoading ? <><div className="spinner" /> Analyzing…</> : "✨ Generate list from photo"}
                </button>
              )}
              {photoItems && photoItems.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: 16 }}>🌿 Suggested items</div>
                  {photoItems.map((item, i) => (
                    <div key={i} className="grocery-item">
                      <span className="item-name">{item}</span>
                      <a href={instacartSearch(item)} target="_blank" rel="noreferrer" className="item-ic-btn">🛒</a>
                    </div>
                  ))}
                  <a className="instacart-cta" href={instacartFullList(photoItems)} target="_blank" rel="noreferrer">🛒 Open all on Instacart</a>
                  <button className="instacart-cta" style={{ background: "var(--terracotta)", marginTop: 8 }} onClick={() => addToList(photoItems)}>+ Save to my list</button>
                </>
              )}
              {photoItems && photoItems.length === 0 && (
                <div className="empty" style={{ padding: "20px 0 0" }}>
                  <span className="empty-text">Couldn't identify items — try a clearer photo.</span>
                </div>
              )}
            </div>
          )}

          {/* LIST */}
          {tab === "list" && (
            <div className="card">
              <div className="list-header">
                <span className="section-title" style={{ margin: 0 }}>🛒 My List</span>
                {listItems.length > 0 && <span className="list-count">{unchecked.length} left</span>}
              </div>
              {listItems.length === 0 ? (
                <div className="empty">
                  <span className="empty-icon">🌿</span>
                  <span className="empty-text">Your list is empty. Use Chat or Snap to generate one, or add items below.</span>
                </div>
              ) : (
                <>
                  {unchecked.map((item) => (
                    <div key={item.id} className="grocery-item">
                      <div className="item-check" onClick={() => setChecked((c) => ({ ...c, [item.id]: true }))} />
                      <span className="item-name">{item.name}</span>
                      <a href={instacartSearch(item.name)} target="_blank" rel="noreferrer" className="item-ic-btn">🛒</a>
                      <button className="item-del" onClick={() => setListItems((l) => l.filter((i) => i.id !== item.id))}>✕</button>
                    </div>
                  ))}
                  {unchecked.length > 0 && (
                    <a className="instacart-cta" href={instacartFullList(unchecked.map((i) => i.name))} target="_blank" rel="noreferrer">
                      🛒 Send full list to Instacart
                    </a>
                  )}
                  {done.length > 0 && (
                    <>
                      <div className="done-section-label">✓ Got it ({done.length})</div>
                      {done.map((item) => (
                        <div key={item.id} className="grocery-item done">
                          <div className="item-check checked" onClick={() => setChecked((c) => { const n = {...c}; delete n[item.id]; return n; })}>✓</div>
                          <span className="item-name">{item.name}</span>
                          <button className="item-del" onClick={() => setListItems((l) => l.filter((i) => i.id !== item.id))}>✕</button>
                        </div>
                      ))}
                      <button
                        style={{ background: "none", border: "1px solid var(--linen)", borderRadius: 10, padding: "8px 14px", fontSize: "0.78rem", color: "var(--bark-light)", cursor: "pointer", marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}
                        onClick={() => { setListItems((l) => l.filter((i) => !checked[i.id])); setChecked({}); }}
                      >Clear completed</button>
                    </>
                  )}
                </>
              )}
              <div className="add-item-row" style={{ marginTop: listItems.length ? 14 : 0 }}>
                <input
                  className="add-item-input" placeholder="Add an item…"
                  value={newItem} onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newItem.trim()) { setListItems((l) => [...l, { id: Date.now(), name: newItem.trim() }]); setNewItem(""); } }}
                />
                <button className="add-item-btn" onClick={() => { if (newItem.trim()) { setListItems((l) => [...l, { id: Date.now(), name: newItem.trim() }]); setNewItem(""); } }}>+</button>
              </div>
            </div>
          )}

          {/* PRICE */}
          {tab === "price" && (
            <div className="card">
              <div className="section-title">💰 Price Compare</div>
              <div className="note">AI-estimated prices based on typical US grocery store prices (2024–2025).</div>
              <div className="price-search-wrap">
                <input className="price-input" placeholder="e.g. avocados, whole milk…" value={priceQuery} onChange={(e) => setPriceQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") lookupPrice(); }} />
                <button className="price-search-btn" onClick={lookupPrice} disabled={priceLoading || !priceQuery.trim()}>
                  {priceLoading ? <div className="spinner" /> : "Compare"}
                </button>
              </div>
              {priceData && !priceData.error && (
                <div className="price-card">
                  <div className="price-item-name">{priceData.item}</div>
                  {priceData.prices?.map((p, i) => (
                    <div key={i} className="price-row">
                      <span className="store-name">{p.store}</span>
                      <span><span className="store-price">{p.price}</span><span className="store-unit">{p.unit}</span></span>
                      <a href={instacartSearch(priceData.item)} target="_blank" rel="noreferrer" className="item-ic-btn" style={{ fontSize: "0.7rem", padding: "4px 8px" }}>🛒 Add</a>
                    </div>
                  ))}
                  {priceData.tip && <div className="price-tip">💡 {priceData.tip}</div>}
                </div>
              )}
              {!priceData && !priceLoading && (
                <div className="empty">
                  <span className="empty-icon">💰</span>
                  <span className="empty-text">Search any grocery item to compare prices across Kroger, Walmart, Whole Foods & Target.</span>
                </div>
              )}
              {priceData?.error && <div className="empty"><span className="empty-text">Couldn't load prices. Try again.</span></div>}
            </div>
          )}
        </div>

        <nav className="bottom-nav">
          {[
            { id: "chat",  icon: "💬", label: "Chat",   dot: false },
            { id: "photo", icon: "📷", label: "Snap",   dot: false },
            { id: "list",  icon: "🛒", label: "List",   dot: unchecked.length > 0 },
            { id: "price", icon: "💰", label: "Prices", dot: false },
          ].map((t) => (
            <button key={t.id} className={`nav-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.dot && <span className="nav-dot" />}
              <span className="nav-icon">{t.icon}</span>
              <span className="nav-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

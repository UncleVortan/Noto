/* ═══════════════════════════════════════════════════════
   Noto — background.js
   • Context menu for saving highlights
   • AI relay for content-script requests
     Keys are read here in the service worker and sent
     only to the provider endpoint — NEVER passed to
     content scripts or any third party.
═══════════════════════════════════════════════════════ */

/* ── Context menu ── */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveToNoto',
    title: 'Save to Noto',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'saveToNoto') return;
  const text   = info.selectionText?.trim();
  const source = tab?.url ? new URL(tab.url).hostname : '';
  if (!text) return;
  const data  = await chrome.storage.local.get('notoNotes');
  const notes = data.notoNotes || [];
  notes.unshift({ text, source });
  await chrome.storage.local.set({ notoNotes: notes });
  chrome.runtime.sendMessage({ type: 'NOTE_SAVED' }).catch(() => {});
});

/* ── AI relay from content scripts ─────────────────────
   Content scripts send SM_AI_REQUEST messages.
   The service worker reads the API key from storage,
   calls the provider, and returns only the text result.
   The raw API key is NEVER sent back to the content script.
────────────────────────────────────────────────────── */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'SM_AI_REQUEST') return false;
  handleAIRequest(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
  return true; // keep channel open for async response
});

async function handleAIRequest({ action, text, source }) {
  const d = await chrome.storage.local.get(['notoActiveProvider']);
  const provider = d.notoActiveProvider || 'groq';
  const keyStore = await chrome.storage.local.get(`notoKey_${provider}`);
  const apiKey   = keyStore[`notoKey_${provider}`];

  if (!apiKey) return { error: `No API key saved. Open Noto → ⚙ Settings.` };

  const prompts = {
    summarise: {
      system: 'You are a study assistant. Summarise the given text in 4-6 clear bullet points. Be concise and highlight the key ideas.',
      user: text,
    },
    notes: {
      system: 'You are a study assistant. Summarise the given text in 3-5 concise bullet points for study notes.',
      user: text,
    },
    cards: {
      system: `You are a flashcard generator. Produce exactly 5 flashcards from the text.
Respond ONLY with valid JSON: [{"q":"Question?","a":"Answer."}]
No markdown, no explanation, just the JSON array.`,
      user: text,
    },
  };

  const { system, user } = prompts[action] || prompts.summarise;
  let result;

  try {
    switch (provider) {
      case 'groq':      result = await callGroq(apiKey, system, user);      break;
      case 'openai':    result = await callOpenAI(apiKey, system, user);    break;
      case 'anthropic': result = await callAnthropic(apiKey, system, user); break;
      case 'cohere':    result = await callCohere(apiKey, system, user);    break;
      default:          throw new Error('Unknown provider');
    }
  } catch (e) { return { error: e.message }; }

  // For notes action: also persist summary as a note
  if (action === 'notes') {
    const nd = await chrome.storage.local.get('notoNotes');
    const notes = nd.notoNotes || [];
    notes.unshift({ text: result, source });
    await chrome.storage.local.set({ notoNotes: notes });
    chrome.runtime.sendMessage({ type: 'NOTE_SAVED' }).catch(() => {});
  }

  // For cards action: persist flashcards to storage for popup to read
  if (action === 'cards') {
    try {
      const cards = JSON.parse(result.replace(/```json|```/g, '').trim());
      await chrome.storage.local.set({ notoPendingCards: cards });
    } catch {}
  }

  return { result };
}

/* ── Provider calls (same logic as popup.js but in SW) ── */
async function callGroq(apiKey, system, user) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', temperature: 0.4, max_tokens: 1000,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || `Groq ${res.status}`); }
  return (await res.json()).choices[0].message.content.trim();
}

async function callOpenAI(apiKey, system, user) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.4, max_tokens: 1000,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || `OpenAI ${res.status}`); }
  return (await res.json()).choices[0].message.content.trim();
}

async function callAnthropic(apiKey, system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey,
               'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, system,
      messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || `Anthropic ${res.status}`); }
  return (await res.json()).content[0].text.trim();
}

async function callCohere(apiKey, system, user) {
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'command-r-plus-08-2024',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.message || `Cohere ${res.status}`); }
  return (await res.json()).message.content[0].text.trim();
}

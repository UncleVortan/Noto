/* ═══════════════════════════════════════════════════════
   Noto — popup.js
   Multi-provider AI · Timer · Notes · Flashcards · Quiz
═══════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

/* ─── Storage helpers ───────────────────────────────── */
const store = {
  get: keys => new Promise(r => chrome.storage.local.get(keys, r)),
  set: obj  => new Promise(r => chrome.storage.local.set(obj, r)),
};

/* ═══════════════════════════════════════════════════════
   MULTI-PROVIDER AI ROUTER
   Keys are read from chrome.storage.local and sent ONLY
   to the chosen provider's own endpoint — nowhere else.
═══════════════════════════════════════════════════════ */
const PROVIDERS = {
  groq: {
    label:   'Groq API Key',
    link:    'https://console.groq.com',
    linkTxt: 'Get free key ↗',
    placeholder: 'gsk_…',
  },
  openai: {
    label:   'OpenAI API Key',
    link:    'https://platform.openai.com/api-keys',
    linkTxt: 'Get key ↗',
    placeholder: 'sk-…',
  },
  anthropic: {
    label:   'Anthropic API Key',
    link:    'https://console.anthropic.com/settings/keys',
    linkTxt: 'Get key ↗',
    placeholder: 'sk-ant-…',
  },
  cohere: {
    label:   'Cohere API Key',
    link:    'https://dashboard.cohere.com/api-keys',
    linkTxt: 'Get free key ↗',
    placeholder: 'Your Cohere key…',
  },
};

let notoActiveProvider = 'groq';

async function aiChat(systemPrompt, userMessage) {
  const storageKey = `notoKey_${notoActiveProvider}`;
  const d = await store.get(storageKey);
  const apiKey = d[storageKey];
  if (!apiKey) throw new Error(`No API key saved for ${notoActiveProvider}. Open ⚙ Settings.`);

  switch (notoActiveProvider) {
    case 'groq':      return callGroq(apiKey, systemPrompt, userMessage);
    case 'openai':    return callOpenAI(apiKey, systemPrompt, userMessage);
    case 'anthropic': return callAnthropic(apiKey, systemPrompt, userMessage);
    case 'cohere':    return callCohere(apiKey, systemPrompt, userMessage);
    default: throw new Error('Unknown provider');
  }
}

/* ── Groq ─────────────────────────────────────────── */
async function callGroq(apiKey, system, user) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', temperature: 0.4, max_tokens: 1200,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || `Groq ${res.status}`); }
  return (await res.json()).choices[0].message.content.trim();
}

/* ── OpenAI ───────────────────────────────────────── */
async function callOpenAI(apiKey, system, user) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini', temperature: 0.4, max_tokens: 1200,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || `OpenAI ${res.status}`); }
  return (await res.json()).choices[0].message.content.trim();
}

/* ── Anthropic ────────────────────────────────────── */
async function callAnthropic(apiKey, system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || `Anthropic ${res.status}`); }
  return (await res.json()).content[0].text.trim();
}

/* ── Cohere ───────────────────────────────────────── */
async function callCohere(apiKey, system, user) {
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'command-r-plus-08-2024',
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user   },
      ],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.message || `Cohere ${res.status}`); }
  const data = await res.json();
  return data.message.content[0].text.trim();
}

/* ═══════════════════════════════════════════════════════
   SETTINGS PANEL
═══════════════════════════════════════════════════════ */
let settingsOpen = false;

$('settingsBtn').addEventListener('click', () => {
  settingsOpen = !settingsOpen;
  $('settingsPanel').style.display = settingsOpen ? 'flex' : 'none';
});

// Provider switcher
document.querySelectorAll('.provider-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('.provider-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    notoActiveProvider = btn.dataset.provider;
    await store.set({ notoActiveProvider });
    updateKeyUI();
    // Load saved key for this provider into input (masked)
    const d = await store.get(`notoKey_${notoActiveProvider}`);
    $('apiKeyInput').value = d[`notoKey_${notoActiveProvider}`] ? '••••••••••••••••' : '';
    $('keyStatus').textContent = '';
  });
});

function updateKeyUI() {
  const p = PROVIDERS[notoActiveProvider];
  $('keyLabel').textContent   = p.label;
  $('keyLink').href           = p.link;
  $('keyLink').textContent    = p.linkTxt;
  $('apiKeyInput').placeholder = p.placeholder;
}

// Clear masked value on focus so user can type a new key
$('apiKeyInput').addEventListener('focus', () => {
  if ($('apiKeyInput').value === '••••••••••••••••') $('apiKeyInput').value = '';
});

$('saveKeyBtn').addEventListener('click', async () => {
  const key = $('apiKeyInput').value.trim();
  if (!key || key === '••••••••••••••••') {
    $('keyStatus').textContent = '⚠ Please enter a valid key.';
    $('keyStatus').style.color = 'var(--red)';
    return;
  }
  // Store under provider-specific key — never mixed up
  await store.set({ [`notoKey_${notoActiveProvider}`]: key, notoActiveProvider });
  $('apiKeyInput').value = '••••••••••••••••';
  $('keyStatus').textContent = '✓ Saved securely!';
  $('keyStatus').style.color = 'var(--green)';
  setTimeout(() => { $('keyStatus').textContent = ''; }, 2500);
});

// Init: restore last active provider
store.get(['notoActiveProvider']).then(async d => {
  if (d.notoActiveProvider) {
    notoActiveProvider = d.notoActiveProvider;
    document.querySelectorAll('.provider-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.provider === notoActiveProvider);
    });
  }
  updateKeyUI();
  const kd = await store.get(`notoKey_${notoActiveProvider}`);
  if (kd[`notoKey_${notoActiveProvider}`]) $('apiKeyInput').value = '••••••••••••••••';
});

/* ═══════════════════════════════════════════════════════
   TABS
═══════════════════════════════════════════════════════ */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    $(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

/* ═══════════════════════════════════════════════════════
   POMODORO TIMER
═══════════════════════════════════════════════════════ */
const CIRCUMFERENCE = 2 * Math.PI * 52;
let timerInterval = null, timerRunning = false;
let timerSeconds = 25 * 60, totalSeconds = 25 * 60;
let isBreak = false, sessionsComplete = 0;
let focusMins = 25, breakMins = 5;

function updateTimerUI() {
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const s = String(timerSeconds % 60).padStart(2, '0');
  $('timerDisplay').textContent = `${m}:${s}`;
  $('timerLabel').textContent   = isBreak ? 'Break' : 'Focus';
  $('ringFg').style.strokeDashoffset = CIRCUMFERENCE * (1 - timerSeconds / totalSeconds);
}
function updateDots() {
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('done', i < sessionsComplete % 4));
}
$('timerToggle').addEventListener('click', () => {
  if (timerRunning) {
    clearInterval(timerInterval); timerRunning = false; $('timerToggle').textContent = 'Resume';
  } else {
    timerRunning = true; $('timerToggle').textContent = 'Pause';
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerUI();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval); timerRunning = false;
        if (!isBreak) { sessionsComplete++; updateDots(); }
        isBreak = !isBreak;
        totalSeconds = timerSeconds = isBreak ? breakMins * 60 : focusMins * 60;
        $('timerToggle').textContent = 'Start';
        updateTimerUI();
      }
    }, 1000);
  }
});
$('timerReset').addEventListener('click', () => {
  clearInterval(timerInterval); timerRunning = false; isBreak = false;
  timerSeconds = totalSeconds = focusMins * 60; $('timerToggle').textContent = 'Start'; updateTimerUI();
});
$('timerSkip').addEventListener('click', () => {
  clearInterval(timerInterval); timerRunning = false;
  if (!isBreak) { sessionsComplete++; updateDots(); }
  isBreak = !isBreak;
  totalSeconds = timerSeconds = isBreak ? breakMins * 60 : focusMins * 60;
  $('timerToggle').textContent = 'Start'; updateTimerUI();
});
document.querySelectorAll('.pill[data-mode]').forEach(p => {
  p.addEventListener('click', () => {
    document.querySelectorAll('.pill[data-mode]').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    focusMins = parseInt(p.dataset.focus); breakMins = parseInt(p.dataset.break);
    clearInterval(timerInterval); timerRunning = false; isBreak = false;
    timerSeconds = totalSeconds = focusMins * 60; $('timerToggle').textContent = 'Start'; updateTimerUI();
  });
});
updateTimerUI();

/* ═══════════════════════════════════════════════════════
   NOTES
═══════════════════════════════════════════════════════ */
let notes = [];

async function loadNotes() {
  const d = await store.get('notoNotes');
  notes = d.notoNotes || [];
  renderNotes();
}
function renderNotes() {
  const list = $('notesList');
  if (!notes.length) {
    list.innerHTML = `<div class="empty-state"><span>📋</span><p>Highlight text on any page, then right-click → <em>Save to Noto</em></p></div>`;
    return;
  }
  list.innerHTML = notes.map((n, i) => `
    <div class="note-item">
      <div class="note-text">${escHtml(n.text)}${n.source ? `<div class="note-source">↗ ${escHtml(n.source)}</div>` : ''}</div>
      <button class="note-del" data-i="${i}" title="Delete">×</button>
    </div>`).join('');
  list.querySelectorAll('.note-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      notes.splice(parseInt(btn.dataset.i), 1);
      await store.set({ notoNotes: notes }); renderNotes();
    });
  });
}
$('addNoteBtn').addEventListener('click', async () => {
  const val = $('manualNoteInput').value.trim(); if (!val) return;
  notes.unshift({ text: val, source: '' });
  await store.set({ notoNotes: notes }); $('manualNoteInput').value = ''; renderNotes();
});
$('manualNoteInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('addNoteBtn').click(); });
$('clearNotesBtn').addEventListener('click', async () => {
  if (!notes.length || !confirm('Clear all notes?')) return;
  notes = []; await store.set({ notoNotes: [] }); renderNotes();
});
$('exportNotesBtn').addEventListener('click', () => { if (notes.length) openExportModal('notes'); });
chrome.runtime.onMessage.addListener(async msg => { if (msg.type === 'NOTE_SAVED') await loadNotes(); });
loadNotes();

/* ═══════════════════════════════════════════════════════
   FLASHCARDS
═══════════════════════════════════════════════════════ */
let flashcards = [], currentCard = 0, fcSource = 'selection';

document.querySelectorAll('#tab-flashcards .pill[data-source]').forEach(p => {
  p.addEventListener('click', () => {
    document.querySelectorAll('#tab-flashcards .pill[data-source]').forEach(x => x.classList.remove('active'));
    p.classList.add('active'); fcSource = p.dataset.source;
    $('fcHint').textContent = fcSource === 'selection'
      ? 'Select text on a page, then generate cards.'
      : 'Cards will be generated from your saved notes.';
  });
});

$('generateCardsBtn').addEventListener('click', async () => {
  let content = '';
  if (fcSource === 'selection') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, func: () => window.getSelection().toString().trim() });
    content = results[0]?.result || '';
    if (!content) { $('fcStatus').textContent = '⚠ No text selected on the page.'; return; }
  } else {
    const nd = await store.get('notoNotes');
    const ns = nd.notoNotes || [];
    if (!ns.length) { $('fcStatus').textContent = '⚠ No notes saved yet.'; return; }
    content = ns.map(n => n.text).join('\n');
  }

  $('generateCardsBtnLabel').innerHTML = '<span class="spinning">◈</span> Generating…';
  $('generateCardsBtn').disabled = true; $('fcStatus').textContent = '';

  try {
    const raw = await aiChat(
      `You are a flashcard generator. Given study content, produce exactly 5 flashcards.
Respond ONLY with valid JSON — an array: [{"q":"Question?","a":"Answer."}]
No markdown, no explanation, just the JSON array.`,
      content
    );
    flashcards = JSON.parse(raw.replace(/```json|```/g, '').trim());
    currentCard = 0; showCard();
    Object.assign($('flashcardsArea').style, { display:'flex', flexDirection:'column', gap:'8px' });
  } catch(e) { $('fcStatus').textContent = `⚠ ${e.message}`; }
  finally {
    $('generateCardsBtnLabel').textContent = '✦ Generate Flashcards';
    $('generateCardsBtn').disabled = false;
  }
});

function showCard() {
  if (!flashcards.length) return;
  const fc = flashcards[currentCard];
  $('flashcardFront').textContent = fc.q; $('flashcardBack').textContent = fc.a;
  $('flashcard').classList.remove('flipped');
  $('cardCounter').textContent = `${currentCard + 1} / ${flashcards.length}`;
}
$('flashcard').addEventListener('click', () => $('flashcard').classList.toggle('flipped'));
$('prevCard').addEventListener('click', () => { if (currentCard > 0) { currentCard--; showCard(); } });
$('nextCard').addEventListener('click', () => { if (currentCard < flashcards.length - 1) { currentCard++; showCard(); } });

/* ═══════════════════════════════════════════════════════
   QUIZ
═══════════════════════════════════════════════════════ */
let quizQuestions = [], quizIndex = 0, quizCorrect = 0, quizSource = 'page';

document.querySelectorAll('#tab-quiz .pill[data-source]').forEach(p => {
  p.addEventListener('click', () => {
    document.querySelectorAll('#tab-quiz .pill[data-source]').forEach(x => x.classList.remove('active'));
    p.classList.add('active'); quizSource = p.dataset.source;
  });
});

$('generateQuizBtn').addEventListener('click', async () => {
  let content = '';
  if (quizSource === 'page') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, func: () => document.body.innerText.slice(0, 4000) });
    content = results[0]?.result || '';
    if (!content.trim()) { $('quizStatus').textContent = '⚠ Could not read page content.'; return; }
  } else {
    const nd = await store.get('notoNotes');
    const ns = nd.notoNotes || [];
    if (!ns.length) { $('quizStatus').textContent = '⚠ No notes saved yet.'; return; }
    content = ns.map(n => n.text).join('\n');
  }

  $('generateQuizBtnLabel').innerHTML = '<span class="spinning">◈</span> Generating…';
  $('generateQuizBtn').disabled = true; $('quizStatus').textContent = '';

  try {
    const raw = await aiChat(
      `You are a quiz generator. Create exactly 5 multiple-choice questions from the content.
Respond ONLY with valid JSON: [{"q":"Question?","options":["A","B","C","D"],"answer":0}]
"answer" is the 0-based index of the correct option. No markdown, just the JSON array.`,
      content
    );
    quizQuestions = JSON.parse(raw.replace(/```json|```/g, '').trim());
    quizIndex = 0; quizCorrect = 0;
    Object.assign($('quizArea').style, { display:'flex', flexDirection:'column', gap:'8px' });
    $('quizScore').style.display = 'none'; $('quizNextBtn').style.display = 'none';
    $('exportQuizBtn').style.display = 'none';
    showQuizQuestion();
  } catch(e) { $('quizStatus').textContent = `⚠ ${e.message}`; }
  finally { $('generateQuizBtnLabel').textContent = '✦ Generate Quiz'; $('generateQuizBtn').disabled = false; }
});

function showQuizQuestion() {
  if (quizIndex >= quizQuestions.length) { showQuizScore(); return; }
  const q = quizQuestions[quizIndex];
  $('quizProgressFill').style.width = (quizIndex / quizQuestions.length * 100) + '%';
  $('quizQNum').textContent = `Question ${quizIndex + 1} of ${quizQuestions.length}`;
  $('quizQuestion').textContent = q.q;
  $('quizFeedback').textContent = ''; $('quizNextBtn').style.display = 'none';
  $('quizOptions').innerHTML = q.options.map((opt, i) => `<button class="quiz-option" data-i="${i}">${opt}</button>`).join('');
  $('quizOptions').querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosen = parseInt(btn.dataset.i);
      $('quizOptions').querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
      if (chosen === q.answer) {
        btn.classList.add('correct'); $('quizFeedback').textContent = '✓ Correct!'; $('quizFeedback').style.color = 'var(--green)'; quizCorrect++;
      } else {
        btn.classList.add('wrong');
        $('quizOptions').querySelectorAll('.quiz-option')[q.answer].classList.add('correct');
        $('quizFeedback').textContent = `✗ Correct: ${q.options[q.answer]}`; $('quizFeedback').style.color = 'var(--red)';
      }
      $('quizNextBtn').style.display = 'flex';
    });
  });
}
$('quizNextBtn').addEventListener('click', () => { quizIndex++; showQuizQuestion(); });

function showQuizScore() {
  $('quizProgressFill').style.width = '100%';
  $('quizOptions').innerHTML = ''; $('quizQuestion').textContent = ''; $('quizFeedback').textContent = '';
  $('quizNextBtn').style.display = 'none';
  const pct = Math.round(quizCorrect / quizQuestions.length * 100);
  const msg = pct === 100 ? '🎉 Perfect!' : pct >= 60 ? '👍 Good job!' : '📖 Keep studying!';
  $('quizScore').innerHTML = `<strong>${quizCorrect}/${quizQuestions.length}</strong>${pct}% — ${msg}`;
  $('quizScore').style.display = 'block'; $('exportQuizBtn').style.display = 'flex';
}

/* ═══════════════════════════════════════════════════════
   EXPORT MODAL
═══════════════════════════════════════════════════════ */
let exportTarget = null;
function openExportModal(t) { exportTarget = t; $('exportModal').style.display = 'flex'; }
$('modalCancel').addEventListener('click', () => { $('exportModal').style.display = 'none'; });
$('exportModal').addEventListener('click', e => { if (e.target === $('exportModal')) $('exportModal').style.display = 'none'; });
document.querySelectorAll('.modal-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    $('exportModal').style.display = 'none';
    const fmt = btn.dataset.fmt;
    if (exportTarget === 'notes')      downloadNotes(fmt);
    if (exportTarget === 'flashcards') downloadFlashcards(fmt);
    if (exportTarget === 'quiz')       downloadQuiz(fmt);
  });
});
$('exportCardsBtn').addEventListener('click', () => { if (flashcards.length) openExportModal('flashcards'); });
$('exportQuizBtn').addEventListener('click',  () => { if (quizQuestions.length) openExportModal('quiz'); });

/* ── Download helpers ────────────────────────────── */
function downloadNotes(fmt) {
  const date = new Date().toLocaleDateString();
  let content, mime, ext;
  if (fmt === 'txt') {
    content = `Noto Notes — ${date}\n${'─'.repeat(40)}\n\n` + notes.map((n,i) => `${i+1}. ${n.text}${n.source?`\n   Source: ${n.source}`:''}`).join('\n\n');
    mime='text/plain'; ext='txt';
  } else if (fmt === 'csv') {
    content = 'Note,Source\n' + notes.map(n=>`"${n.text.replace(/"/g,'""')}","${(n.source||'').replace(/"/g,'""')}"`).join('\n');
    mime='text/csv'; ext='csv';
  } else if (fmt === 'json') {
    content = JSON.stringify({ exported: date, notes }, null, 2); mime='application/json'; ext='json';
  } else {
    content = `# Noto Notes\n_${date}_\n\n` + notes.map((n,i)=>`${i+1}. ${n.text}${n.source?`\n   > Source: ${n.source}`:''}`).join('\n\n');
    mime='text/markdown'; ext='md';
  }
  triggerDownload(content, `noto-notes.${ext}`, mime);
}

function downloadFlashcards(fmt) {
  const date = new Date().toLocaleDateString();
  let content, mime, ext;
  if (fmt === 'txt') {
    content = `Noto Flashcards — ${date}\n${'─'.repeat(40)}\n\n` + flashcards.map((c,i)=>`Card ${i+1}\nQ: ${c.q}\nA: ${c.a}`).join('\n\n');
    mime='text/plain'; ext='txt';
  } else if (fmt === 'csv') {
    content = 'Question,Answer\n' + flashcards.map(c=>`"${c.q.replace(/"/g,'""')}","${c.a.replace(/"/g,'""')}"`).join('\n');
    mime='text/csv'; ext='csv';
  } else if (fmt === 'json') {
    content = JSON.stringify({ exported: date, flashcards }, null, 2); mime='application/json'; ext='json';
  } else {
    content = `# Noto Flashcards\n_${date}_\n\n` + flashcards.map((c,i)=>`### Card ${i+1}\n**Q:** ${c.q}\n\n**A:** ${c.a}`).join('\n\n---\n\n');
    mime='text/markdown'; ext='md';
  }
  triggerDownload(content, `noto-flashcards.${ext}`, mime);
}

function downloadQuiz(fmt) {
  const date = new Date().toLocaleDateString();
  let content, mime, ext;
  if (fmt === 'txt') {
    content = `Noto Quiz — ${date}\n${'─'.repeat(40)}\n\n` + quizQuestions.map((q,i)=>`Q${i+1}: ${q.q}\n`+q.options.map((o,j)=>`  ${j===q.answer?'✓':' '} ${String.fromCharCode(65+j)}. ${o}`).join('\n')).join('\n\n');
    mime='text/plain'; ext='txt';
  } else if (fmt === 'csv') {
    content = 'Question,A,B,C,D,Correct\n' + quizQuestions.map(q=>`"${q.q.replace(/"/g,'""')}",`+q.options.map(o=>`"${o.replace(/"/g,'""')}"`).join(',')+`,"${String.fromCharCode(65+q.answer)}"`).join('\n');
    mime='text/csv'; ext='csv';
  } else if (fmt === 'json') {
    content = JSON.stringify({ exported: date, quiz: quizQuestions }, null, 2); mime='application/json'; ext='json';
  } else {
    content = `# Noto Quiz\n_${date}_\n\n` + quizQuestions.map((q,i)=>`### Q${i+1}: ${q.q}\n`+q.options.map((o,j)=>`- ${j===q.answer?'**✓**':'  '} ${String.fromCharCode(65+j)}. ${o}`).join('\n')).join('\n\n---\n\n');
    mime='text/markdown'; ext='md';
  }
  triggerDownload(content, `noto-quiz.${ext}`, mime);
}

function triggerDownload(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ─── Utility ───────────────────────────────────── */
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

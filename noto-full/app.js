/* ═══════════════════════════════════════════════════════
   Noto — app.js
   Single-file app · localStorage · Multi-provider AI
═══════════════════════════════════════════════════════ */

'use strict';

const $ = id => document.getElementById(id);
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

/* ═══════════════════════════════════════════════════════
   STATE & STORAGE
═══════════════════════════════════════════════════════ */
const DB = {
  defaults: {
    notes: [],
    fcSets: [],
    quizHistory: [],
    stats: { focusMinutes: 0, sessions: 0, activityLog: {} },
    settings: { provider: 'groq', keys: {} },
  },
  load() {
    try {
      const raw = localStorage.getItem('noto_v1');
      return raw ? { ...this.defaults, ...JSON.parse(raw) } : { ...this.defaults };
    } catch { return { ...this.defaults }; }
  },
  save(data) {
    localStorage.setItem('noto_v1', JSON.stringify(data));
  },
};

let state = DB.load();
function save() { DB.save(state); }

/* ═══════════════════════════════════════════════════════
   AI ROUTER — keys never leave the browser to anywhere
   except the chosen provider's endpoint
═══════════════════════════════════════════════════════ */
const PROVIDER_META = {
  groq:      { label: 'Groq API Key',      link: 'https://console.groq.com',                      ph: 'gsk_…' },
  openai:    { label: 'OpenAI API Key',     link: 'https://platform.openai.com/api-keys',           ph: 'sk-…' },
  anthropic: { label: 'Anthropic API Key',  link: 'https://console.anthropic.com/settings/keys',   ph: 'sk-ant-…' },
  cohere:    { label: 'Cohere API Key',     link: 'https://dashboard.cohere.com/api-keys',          ph: 'Your key…' },
};

async function aiChat(system, user) {
  const provider = state.settings.provider;
  const apiKey   = state.settings.keys[provider];
  if (!apiKey) throw new Error(`No API key for ${provider}. Go to Settings.`);

  switch (provider) {
    case 'groq':      return _groq(apiKey, system, user);
    case 'openai':    return _openai(apiKey, system, user);
    case 'anthropic': return _anthropic(apiKey, system, user);
    case 'cohere':    return _cohere(apiKey, system, user);
    default: throw new Error('Unknown provider');
  }
}

async function _groq(key, sys, usr) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body: JSON.stringify({ model:'llama-3.1-8b-instant', temperature:0.4, max_tokens:1500,
      messages:[{role:'system',content:sys},{role:'user',content:usr}] }),
  });
  if (!r.ok) { const e=await r.json().catch(()=>({})); throw new Error(e?.error?.message||`Groq ${r.status}`); }
  return (await r.json()).choices[0].message.content.trim();
}
async function _openai(key, sys, usr) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body: JSON.stringify({ model:'gpt-4o-mini', temperature:0.4, max_tokens:1500,
      messages:[{role:'system',content:sys},{role:'user',content:usr}] }),
  });
  if (!r.ok) { const e=await r.json().catch(()=>({})); throw new Error(e?.error?.message||`OpenAI ${r.status}`); }
  return (await r.json()).choices[0].message.content.trim();
}
async function _anthropic(key, sys, usr) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json','x-api-key':key,
      'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:1500, system:sys,
      messages:[{role:'user',content:usr}] }),
  });
  if (!r.ok) { const e=await r.json().catch(()=>({})); throw new Error(e?.error?.message||`Anthropic ${r.status}`); }
  return (await r.json()).content[0].text.trim();
}
async function _cohere(key, sys, usr) {
  const r = await fetch('https://api.cohere.com/v2/chat', {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body: JSON.stringify({ model:'command-r-plus-08-2024',
      messages:[{role:'system',content:sys},{role:'user',content:usr}] }),
  });
  if (!r.ok) { const e=await r.json().catch(()=>({})); throw new Error(e?.message||`Cohere ${r.status}`); }
  return (await r.json()).message.content[0].text.trim();
}

async function aiJSON(system, user) {
  const raw = await aiChat(system, user);
  return JSON.parse(raw.replace(/```json|```/g,'').trim());
}

/* ═══════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════ */
const VIEW_TITLES = {
  dashboard:'Dashboard', notes:'Notes', flashcards:'Flashcards',
  quiz:'Quiz', chat:'AI Chat', timer:'Focus Timer',
  stats:'Stats', settings:'Settings',
};

function showView(name) {
  qsa('.view').forEach(v => v.classList.remove('active'));
  qsa('.nav-item').forEach(n => n.classList.remove('active'));
  const view = $(`view-${name}`);
  if (view) view.classList.add('active');
  const navBtn = qs(`.nav-item[data-view="${name}"]`);
  if (navBtn) navBtn.classList.add('active');
  $('viewTitle').textContent = VIEW_TITLES[name] || name;
  if (name === 'dashboard') refreshDashboard();
  if (name === 'stats')     refreshStats();
  if (name === 'notes')     renderNotesList();
  if (name === 'flashcards') renderFcSets();
  if (name === 'quiz')       renderQuizHistory();
  if (name === 'chat')       populateChatContext();
  if (name === 'settings')   initSettings();
}

qsa('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

qsa('.dash-card').forEach(c => {
  c.addEventListener('click', () => showView(c.dataset.goto));
});

// Mobile sidebar
$('menuBtn').addEventListener('click', () => $('sidebar').classList.toggle('mobile-open'));
$('sidebarToggle').addEventListener('click', () => $('sidebar').classList.toggle('collapsed'));

/* ═══════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════ */
function refreshDashboard() {
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning.' : hr < 18 ? 'Good afternoon.' : 'Good evening.';
  $('dashGreeting').textContent = greet;

  $('statNotesCount').textContent = state.notes.length;
  $('statSetsCount').textContent  = state.fcSets.length;
  $('statQuizCount').textContent  = state.quizHistory.length;
  $('statFocusCount').textContent = state.stats.focusMinutes;

  // Recent notes
  const recent = [...state.notes].sort((a,b) => b.updated - a.updated).slice(0, 5);
  const rl = $('recentNotesList');
  rl.innerHTML = recent.length ? recent.map(n => `
    <div class="recent-note-item" data-id="${n.id}">
      <div>
        <div class="recent-note-title">${esc(n.title || 'Untitled')}</div>
      </div>
      <div class="recent-note-date">${fmtDate(n.updated)}</div>
    </div>`).join('') : '<div class="empty-hint">No notes yet.</div>';
  rl.querySelectorAll('.recent-note-item').forEach(el => {
    el.addEventListener('click', () => { showView('notes'); openNote(el.dataset.id); });
  });

  // Streak bar
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today = new Date();
  const bar = $('streakBar');
  bar.innerHTML = days.map((d, i) => {
    const dt = new Date(today);
    dt.setDate(today.getDate() - ((today.getDay() + 6) % 7) + i);
    const key = dt.toISOString().slice(0, 10);
    const active = state.stats.activityLog[key] ? 'active' : '';
    return `<div class="streak-day ${active}"><div class="streak-day-label">${d}</div></div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════
   NOTES
═══════════════════════════════════════════════════════ */
let activeNoteId = null;
let noteAutoSave = null;

function renderNotesList(filter = '') {
  const list = $('notesList');
  let notes = [...state.notes].sort((a,b) => b.updated - a.updated);
  if (filter) notes = notes.filter(n =>
    (n.title + n.body).toLowerCase().includes(filter.toLowerCase()));

  list.innerHTML = notes.length ? notes.map(n => `
    <div class="note-list-item ${n.id === activeNoteId ? 'active' : ''}" data-id="${n.id}">
      <div class="note-list-title">${esc(n.title || 'Untitled')}</div>
      <div class="note-list-preview">${esc((n.body || '').slice(0, 60))}</div>
      <div class="note-list-date">${fmtDate(n.updated)}</div>
    </div>`).join('')
    : '<div style="padding:16px;color:var(--text3);font-size:12px;">No notes found.</div>';

  list.querySelectorAll('.note-list-item').forEach(el => {
    el.addEventListener('click', () => openNote(el.dataset.id));
  });
}

function openNote(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  activeNoteId = id;
  $('noteEditorEmpty').style.display = 'none';
  $('noteEditorActive').style.display = 'flex';
  $('noteTitleInput').value = note.title || '';
  $('noteBodyInput').value  = note.body  || '';
  $('noteMeta').textContent = `Last edited ${fmtDate(note.updated)}  ·  ${(note.body||'').split(/\s+/).filter(Boolean).length} words`;
  $('noteAiResult').style.display = 'none';
  renderNotesList();
}

$('newNoteBtn').addEventListener('click', () => {
  const note = { id: uid(), title: '', body: '', created: Date.now(), updated: Date.now() };
  state.notes.unshift(note); save();
  renderNotesList(); openNote(note.id);
  $('noteTitleInput').focus();
  logActivity();
});

function autoSaveNote() {
  if (!activeNoteId) return;
  const note = state.notes.find(n => n.id === activeNoteId);
  if (!note) return;
  note.title   = $('noteTitleInput').value;
  note.body    = $('noteBodyInput').value;
  note.updated = Date.now();
  save(); renderNotesList();
  $('noteMeta').textContent = `Last edited just now  ·  ${(note.body||'').split(/\s+/).filter(Boolean).length} words`;
}

[$('noteTitleInput'), $('noteBodyInput')].forEach(el => {
  el.addEventListener('input', () => {
    clearTimeout(noteAutoSave);
    noteAutoSave = setTimeout(autoSaveNote, 600);
  });
});

$('deleteNoteBtn').addEventListener('click', () => {
  if (!activeNoteId || !confirm('Delete this note?')) return;
  state.notes = state.notes.filter(n => n.id !== activeNoteId);
  save(); activeNoteId = null;
  $('noteEditorEmpty').style.display = 'flex';
  $('noteEditorActive').style.display = 'none';
  renderNotesList();
});

$('noteSearch').addEventListener('input', e => renderNotesList(e.target.value));

// AI summarise note
$('aiSummariseNoteBtn').addEventListener('click', async () => {
  if (!activeNoteId) return;
  const note = state.notes.find(n => n.id === activeNoteId);
  if (!note?.body) return;
  $('noteAiResult').style.display = 'block';
  $('noteAiResult').textContent = '◈ Summarising…';
  try {
    const res = await aiChat(
      'Summarise the following note in 4-6 bullet points. Be concise and highlight key ideas.',
      note.body
    );
    $('noteAiResult').textContent = res;
  } catch(e) { $('noteAiResult').textContent = `⚠ ${e.message}`; }
});

// Note → flashcards
$('noteToCardsBtn').addEventListener('click', () => {
  if (!activeNoteId) return;
  showView('flashcards');
  openGenCardsModal(activeNoteId);
});

// PDF / file import
$('pdfBrowseBtn').addEventListener('click', () => $('pdfInput').click());
$('pdfInput').addEventListener('change', e => handleFileImport(e.target.files[0]));
const dz = $('pdfDropZone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => {
  e.preventDefault(); dz.classList.remove('drag-over');
  handleFileImport(e.dataTransfer.files[0]);
});

async function handleFileImport(file) {
  if (!file) return;
  const text = await file.text();
  const note = {
    id: uid(), title: file.name.replace(/\.[^.]+$/, ''),
    body: text, created: Date.now(), updated: Date.now(),
  };
  state.notes.unshift(note); save();
  renderNotesList(); openNote(note.id);
  logActivity();
}

/* ═══════════════════════════════════════════════════════
   FLASHCARDS
═══════════════════════════════════════════════════════ */
let activeFcSetId = null;
let activeFcIndex = 0;
let genCardsCount = 5;

function renderFcSets() {
  const list = $('fcSetsList');
  list.innerHTML = state.fcSets.length
    ? state.fcSets.map(s => `
      <div class="fc-set-item ${s.id === activeFcSetId ? 'active' : ''}" data-id="${s.id}">
        <div class="fc-set-name">${esc(s.name)}</div>
        <div class="fc-set-meta">${s.cards.length} cards · ${fmtDate(s.created)}</div>
      </div>`).join('')
    : '<div class="empty-hint">No sets yet. Generate cards from a note.</div>';

  list.querySelectorAll('.fc-set-item').forEach(el => {
    el.addEventListener('click', () => openFcSet(el.dataset.id));
  });
}

function openFcSet(id) {
  const set = state.fcSets.find(s => s.id === id);
  if (!set) return;
  activeFcSetId = id; activeFcIndex = 0;
  $('fcViewerActive').style.display = 'flex';
  qs('.fc-viewer-empty')?.style && (qs('.fc-viewer-empty').style.display = 'none');
  $('fcSetTitle').textContent = set.name;
  showFcCard(); renderFcSets();
}

function showFcCard() {
  const set = state.fcSets.find(s => s.id === activeFcSetId);
  if (!set) return;
  const card = set.cards[activeFcIndex];
  $('fcCardFront').textContent = card.q;
  $('fcCardBack').textContent  = card.a;
  $('fcCard').classList.remove('flipped');
  $('fcCounter').textContent = `${activeFcIndex + 1} / ${set.cards.length}`;
}

$('fcCard').addEventListener('click', () => $('fcCard').classList.toggle('flipped'));
$('fcPrev').addEventListener('click', () => { if (activeFcIndex > 0) { activeFcIndex--; showFcCard(); } });
$('fcNext').addEventListener('click', () => {
  const set = state.fcSets.find(s => s.id === activeFcSetId);
  if (set && activeFcIndex < set.cards.length - 1) { activeFcIndex++; showFcCard(); }
});

$('fcDeleteSetBtn').addEventListener('click', () => {
  if (!activeFcSetId || !confirm('Delete this set?')) return;
  state.fcSets = state.fcSets.filter(s => s.id !== activeFcSetId);
  save(); activeFcSetId = null;
  $('fcViewerActive').style.display = 'none';
  qs('.fc-viewer-empty').style.display = '';
  renderFcSets();
});

$('fcExportBtn').addEventListener('click', () => {
  const set = state.fcSets.find(s => s.id === activeFcSetId);
  if (!set) return;
  openExportModal('flashcards', set);
});

// Generate modal
$('generateCardsBtn').addEventListener('click', () => openGenCardsModal(null));

function openGenCardsModal(noteId) {
  const sel = $('genCardsNoteSelect');
  sel.innerHTML = state.notes.map(n => `<option value="${n.id}" ${n.id===noteId?'selected':''}>${esc(n.title||'Untitled')}</option>`).join('');
  if (!state.notes.length) { $('genCardsStatus').textContent = '⚠ No notes yet. Create a note first.'; }
  $('genCardsModal').style.display = 'flex';
}

qsa('#cardCountPills .pill').forEach(p => {
  p.addEventListener('click', () => {
    qsa('#cardCountPills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active'); genCardsCount = parseInt(p.dataset.n);
  });
});

$('genCardsCancel').addEventListener('click', () => $('genCardsModal').style.display = 'none');
$('genCardsConfirm').addEventListener('click', async () => {
  const noteId = $('genCardsNoteSelect').value;
  const note   = state.notes.find(n => n.id === noteId);
  if (!note) return;
  $('genCardsStatus').textContent = '◈ Generating…';
  $('genCardsConfirm').disabled = true;
  try {
    const cards = await aiJSON(
      `You are a flashcard generator. Produce exactly ${genCardsCount} flashcards from the content.
Respond ONLY with valid JSON array: [{"q":"Question?","a":"Answer."}]`,
      (note.title + '\n\n' + note.body).slice(0, 5000)
    );
    const set = { id: uid(), name: note.title || 'Untitled', cards, created: Date.now() };
    state.fcSets.unshift(set); save();
    $('genCardsModal').style.display = 'none';
    renderFcSets(); openFcSet(set.id);
    logActivity();
  } catch(e) { $('genCardsStatus').textContent = `⚠ ${e.message}`; }
  finally { $('genCardsConfirm').disabled = false; }
});

/* ═══════════════════════════════════════════════════════
   QUIZ
═══════════════════════════════════════════════════════ */
let quizQuestions = [], quizIdx = 0, quizCorrect = 0;
let quizCountVal  = 5;

function renderQuizHistory() {
  const list = $('quizHistoryList');
  list.innerHTML = state.quizHistory.length
    ? [...state.quizHistory].reverse().map(q => `
      <div class="quiz-history-item">
        <div class="quiz-history-score">${q.correct}/${q.total}</div>
        <div class="quiz-history-meta">${esc(q.source)} · ${fmtDate(q.date)}</div>
      </div>`).join('')
    : '<div class="empty-hint">No quizzes yet.</div>';
}

$('startQuizBtn').addEventListener('click', () => {
  const notesSel  = $('quizNoteSelect');
  const cardsSel  = $('quizCardsSelect');
  notesSel.innerHTML  = state.notes.map(n => `<option value="${n.id}">${esc(n.title||'Untitled')}</option>`).join('');
  cardsSel.innerHTML  = state.fcSets.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  $('quizSetupModal').style.display = 'flex';
});

$('quizSourceSelect').addEventListener('change', e => {
  $('quizNoteRow').style.display  = e.target.value === 'note'  ? '' : 'none';
  $('quizCardsRow').style.display = e.target.value === 'cards' ? '' : 'none';
});

qsa('#quizCountPills .pill').forEach(p => {
  p.addEventListener('click', () => {
    qsa('#quizCountPills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active'); quizCountVal = parseInt(p.dataset.n);
  });
});

$('quizSetupCancel').addEventListener('click', () => $('quizSetupModal').style.display = 'none');
$('quizSetupConfirm').addEventListener('click', async () => {
  const src = $('quizSourceSelect').value;
  let content = '', sourceName = '';

  if (src === 'note') {
    const note = state.notes.find(n => n.id === $('quizNoteSelect').value);
    if (!note) return;
    content = (note.title + '\n\n' + note.body).slice(0, 5000);
    sourceName = note.title || 'Untitled';
  } else {
    const set = state.fcSets.find(s => s.id === $('quizCardsSelect').value);
    if (!set) return;
    content = set.cards.map(c => `Q: ${c.q}\nA: ${c.a}`).join('\n\n');
    sourceName = set.name;
  }

  $('quizSetupStatus').textContent = '◈ Generating quiz…';
  $('quizSetupConfirm').disabled = true;

  try {
    quizQuestions = await aiJSON(
      `Generate exactly ${quizCountVal} multiple-choice questions from this content.
Respond ONLY with JSON: [{"q":"Question?","options":["A","B","C","D"],"answer":0}]
"answer" is the 0-based index of the correct answer. No markdown, just JSON.`,
      content
    );
    quizIdx = 0; quizCorrect = 0;
    $('quizSetupModal').style.display = 'none';
    $('quizActive').style.display = 'flex';
    $('quizScoreCard').style.display = 'none';
    qs('.quiz-idle').style.display = 'none';
    showQuizQ();
    logActivity();
    // Store sourceName for history
    $('quizActive').dataset.source = sourceName;
  } catch(e) { $('quizSetupStatus').textContent = `⚠ ${e.message}`; }
  finally { $('quizSetupConfirm').disabled = false; }
});

function showQuizQ() {
  if (quizIdx >= quizQuestions.length) { endQuiz(); return; }
  const q = quizQuestions[quizIdx];
  $('quizProgressFill').style.width = (quizIdx / quizQuestions.length * 100) + '%';
  $('quizQNum').textContent = `Question ${quizIdx + 1} of ${quizQuestions.length}`;
  $('quizQuestion').textContent = q.q;
  $('quizFeedback').textContent = '';
  $('quizNextBtn').style.display = 'none';

  $('quizOptions').innerHTML = q.options.map((o, i) =>
    `<button class="quiz-option" data-i="${i}">${esc(o)}</button>`).join('');

  $('quizOptions').querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      $('quizOptions').querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
      const chosen = parseInt(btn.dataset.i);
      if (chosen === q.answer) {
        btn.classList.add('correct');
        $('quizFeedback').textContent = '✓ Correct!';
        $('quizFeedback').style.color = 'var(--green)';
        quizCorrect++;
      } else {
        btn.classList.add('wrong');
        $('quizOptions').querySelectorAll('.quiz-option')[q.answer].classList.add('correct');
        $('quizFeedback').textContent = `✗ Correct: ${q.options[q.answer]}`;
        $('quizFeedback').style.color = 'var(--red)';
      }
      $('quizNextBtn').style.display = 'flex';
    });
  });
}

$('quizNextBtn').addEventListener('click', () => { quizIdx++; showQuizQ(); });

function endQuiz() {
  $('quizProgressFill').style.width = '100%';
  $('quizOptions').innerHTML = ''; $('quizQuestion').textContent = '';
  $('quizFeedback').textContent = ''; $('quizNextBtn').style.display = 'none';
  const pct = Math.round(quizCorrect / quizQuestions.length * 100);
  const msg = pct === 100 ? '🎉 Perfect score!' : pct >= 80 ? '🌟 Excellent!' : pct >= 60 ? '👍 Good job!' : '📖 Keep studying!';
  $('quizScoreNum').textContent = `${quizCorrect}/${quizQuestions.length}`;
  $('quizScoreMsg').textContent = `${pct}% — ${msg}`;
  $('quizScoreCard').style.display = 'flex';
  // Save to history
  const record = {
    id: uid(), correct: quizCorrect, total: quizQuestions.length, pct,
    source: $('quizActive').dataset.source || '', date: Date.now(), questions: quizQuestions,
  };
  state.quizHistory.push(record); save(); renderQuizHistory();
}

$('quizExportBtn').addEventListener('click', () => {
  const last = state.quizHistory[state.quizHistory.length - 1];
  if (last) openExportModal('quiz', last);
});

/* ═══════════════════════════════════════════════════════
   AI CHAT
═══════════════════════════════════════════════════════ */
let chatHistory = [];

function populateChatContext() {
  const sel = $('chatContextSelect');
  sel.innerHTML = '<option value="">No context (general)</option>' +
    state.notes.map(n => `<option value="${n.id}">${esc(n.title||'Untitled')}</option>`).join('');
}

$('clearChatBtn').addEventListener('click', () => {
  chatHistory = []; $('chatMessages').innerHTML = `
    <div class="chat-welcome">
      <span class="chat-welcome-icon">⟁</span>
      <p>Ask anything. Attach a note as context for smarter answers.</p>
    </div>`;
});

$('chatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});
$('chatSendBtn').addEventListener('click', sendChat);

// Auto-resize textarea
$('chatInput').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

async function sendChat() {
  const input = $('chatInput').value.trim();
  if (!input) return;
  $('chatInput').value = ''; $('chatInput').style.height = 'auto';

  // Remove welcome screen
  qs('.chat-welcome')?.remove();

  appendChatMsg('user', input);
  chatHistory.push({ role: 'user', content: input });

  // Build system prompt with optional note context
  const noteId = $('chatContextSelect').value;
  let system = 'You are a helpful study assistant. Be concise and clear.';
  if (noteId) {
    const note = state.notes.find(n => n.id === noteId);
    if (note) system += `\n\nContext note titled "${note.title}":\n${note.body.slice(0, 4000)}`;
  }

  const typingEl = document.createElement('div');
  typingEl.className = 'chat-typing'; typingEl.textContent = '◈ Thinking…';
  $('chatMessages').appendChild(typingEl);
  $('chatMessages').scrollTop = $('chatMessages').scrollHeight;

  try {
    // Build messages for multi-turn
    const userMsg = chatHistory.map(m => m.role === 'user' ? m.content : null).filter(Boolean).join('\n\n---\n\n');
    const reply = await aiChat(system, userMsg);
    typingEl.remove();
    appendChatMsg('assistant', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    logActivity();
  } catch(e) {
    typingEl.remove();
    appendChatMsg('assistant', `⚠ ${e.message}`);
  }
}

function appendChatMsg(role, text) {
  const el = document.createElement('div');
  el.className = `chat-msg ${role}`;
  el.innerHTML = `<div class="chat-bubble">${esc(text)}</div>`;
  $('chatMessages').appendChild(el);
  $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
}

/* ═══════════════════════════════════════════════════════
   FOCUS TIMER
═══════════════════════════════════════════════════════ */
const CIRC = 2 * Math.PI * 88;
let timerInterval = null, timerRunning = false;
let timerSec = 25*60, totalSec = 25*60, isBreak = false;
let sessionsToday = 0, focusMinToday = 0;
let focusMins = 25, breakMins = 5;

function updateTimerUI() {
  const m = String(Math.floor(timerSec/60)).padStart(2,'0');
  const s = String(timerSec%60).padStart(2,'0');
  $('timerDisplay').textContent = `${m}:${s}`;
  $('timerLabel').textContent   = isBreak ? 'Break' : 'Focus';
  $('ringFg').style.strokeDashoffset = CIRC * (1 - timerSec/totalSec);
}
function updateDots() {
  qsa('.dot').forEach((d,i) => d.classList.toggle('done', i < sessionsToday % 4));
}

$('timerToggle').addEventListener('click', () => {
  if (timerRunning) {
    clearInterval(timerInterval); timerRunning = false; $('timerToggle').textContent = 'Resume';
  } else {
    timerRunning = true; $('timerToggle').textContent = 'Pause';
    timerInterval = setInterval(() => {
      timerSec--;
      if (!isBreak) {
        focusMinToday = Math.floor((totalSec - timerSec) / 60);
        $('todayFocusMin').textContent = focusMinToday;
      }
      updateTimerUI();
      if (timerSec <= 0) {
        clearInterval(timerInterval); timerRunning = false;
        if (!isBreak) {
          sessionsToday++;
          state.stats.sessions++;
          state.stats.focusMinutes += focusMins;
          save(); logActivity();
          $('todaySessions').textContent = sessionsToday;
          updateDots();
        }
        isBreak = !isBreak;
        totalSec = timerSec = isBreak ? breakMins*60 : focusMins*60;
        $('timerToggle').textContent = 'Start';
        updateTimerUI();
      }
    }, 1000);
  }
});
$('timerReset').addEventListener('click', () => {
  clearInterval(timerInterval); timerRunning = false; isBreak = false;
  timerSec = totalSec = focusMins*60; $('timerToggle').textContent = 'Start'; updateTimerUI();
});
$('timerSkip').addEventListener('click', () => {
  clearInterval(timerInterval); timerRunning = false;
  if (!isBreak) { sessionsToday++; updateDots(); }
  isBreak = !isBreak;
  totalSec = timerSec = isBreak ? breakMins*60 : focusMins*60;
  $('timerToggle').textContent = 'Start'; updateTimerUI();
});
qsa('.timer-modes .pill').forEach(p => {
  p.addEventListener('click', () => {
    qsa('.timer-modes .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    focusMins = parseInt(p.dataset.focus); breakMins = parseInt(p.dataset.break);
    clearInterval(timerInterval); timerRunning = false; isBreak = false;
    timerSec = totalSec = focusMins*60; $('timerToggle').textContent = 'Start'; updateTimerUI();
  });
});
updateTimerUI();

/* ═══════════════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════════════ */
function refreshStats() {
  $('s-notes').textContent   = state.notes.length;
  $('s-sets').textContent    = state.fcSets.length;
  $('s-cards').textContent   = state.fcSets.reduce((a,s) => a + s.cards.length, 0);
  $('s-quizzes').textContent = state.quizHistory.length;
  $('s-focus').textContent   = state.stats.focusMinutes;
  const avg = state.quizHistory.length
    ? Math.round(state.quizHistory.reduce((a,q) => a + q.pct, 0) / state.quizHistory.length)
    : null;
  $('s-avg').textContent = avg !== null ? `${avg}%` : '—';

  // Quiz history
  $('statsQuizList').innerHTML = state.quizHistory.length
    ? [...state.quizHistory].reverse().slice(0,10).map(q => `
      <div class="quiz-history-item">
        <div class="quiz-history-score">${q.correct}/${q.total} — ${q.pct}%</div>
        <div class="quiz-history-meta">${esc(q.source)} · ${fmtDate(q.date)}</div>
      </div>`).join('')
    : '<div class="empty-hint">No quizzes yet.</div>';

  // Activity chart
  const chart = $('activityChart');
  const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today = new Date();
  chart.innerHTML = days.map((d, i) => {
    const dt = new Date(today);
    dt.setDate(today.getDate() - ((today.getDay() + 6) % 7) + i);
    const key     = dt.toISOString().slice(0, 10);
    const hasData = !!state.stats.activityLog[key];
    return `<div class="activity-bar ${hasData?'has-data':''}" style="height:${hasData?'100%':'20%'}">
      <span class="activity-bar-label">${d}</span></div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════ */
function initSettings() {
  const p = state.settings.provider;
  qsa('.provider-btn').forEach(b => b.classList.toggle('active', b.dataset.provider === p));
  updateSettingsKeyUI(p);
  const key = state.settings.keys[p];
  $('settingsKeyInput').value = key ? '••••••••••••••••' : '';
  $('settingsKeyStatus').textContent = '';
  $('providerBadge').textContent = p.charAt(0).toUpperCase() + p.slice(1);
}

function updateSettingsKeyUI(provider) {
  const m = PROVIDER_META[provider];
  $('settingsKeyLabel').textContent = m.label;
  $('settingsKeyLink').href         = m.link;
  $('settingsKeyInput').placeholder = m.ph;
}

qsa('.provider-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    qsa('.provider-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.settings.provider = btn.dataset.provider; save();
    updateSettingsKeyUI(btn.dataset.provider);
    const key = state.settings.keys[btn.dataset.provider];
    $('settingsKeyInput').value = key ? '••••••••••••••••' : '';
    $('settingsKeyStatus').textContent = '';
    $('providerBadge').textContent = btn.dataset.provider.charAt(0).toUpperCase() + btn.dataset.provider.slice(1);
  });
});

$('settingsKeyInput').addEventListener('focus', () => {
  if ($('settingsKeyInput').value === '••••••••••••••••') $('settingsKeyInput').value = '';
});

$('settingsSaveKey').addEventListener('click', () => {
  const key = $('settingsKeyInput').value.trim();
  if (!key || key === '••••••••••••••••') {
    $('settingsKeyStatus').textContent = '⚠ Enter a valid key';
    $('settingsKeyStatus').style.color = 'var(--red)'; return;
  }
  state.settings.keys[state.settings.provider] = key; save();
  $('settingsKeyInput').value = '••••••••••••••••';
  $('settingsKeyStatus').textContent = '✓ Saved securely!';
  $('settingsKeyStatus').style.color = 'var(--green)';
  setTimeout(() => $('settingsKeyStatus').textContent = '', 2500);
});

/* ─── Data management ── */
$('exportAllBtn').addEventListener('click', () => openExportModal('all', null));
$('exportBtn').addEventListener('click',    () => openExportModal('all', null));

$('importAllBtn').addEventListener('click', () => $('importFileInput').click());
$('importBtn').addEventListener('click',    () => $('importFileInput').click());
$('importFileInput').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (confirm('This will replace all your current Noto data. Continue?')) {
      state = { ...DB.defaults, ...data }; save(); location.reload();
    }
  } catch { alert('Invalid Noto backup file.'); }
});

$('clearAllBtn').addEventListener('click', () => {
  if (confirm('Delete ALL data permanently? This cannot be undone.')) {
    localStorage.removeItem('noto_v1'); location.reload();
  }
});

/* ═══════════════════════════════════════════════════════
   EXPORT MODAL
═══════════════════════════════════════════════════════ */
let exportCtx = { type: null, data: null };

function openExportModal(type, data) {
  exportCtx = { type, data };
  $('exportFmtModal').style.display = 'flex';
}

$('exportFmtCancel').addEventListener('click', () => $('exportFmtModal').style.display = 'none');
$('exportFmtModal').addEventListener('click', e => { if (e.target === $('exportFmtModal')) $('exportFmtModal').style.display = 'none'; });

qsa('.modal-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    $('exportFmtModal').style.display = 'none';
    const fmt = btn.dataset.fmt;
    const { type, data } = exportCtx;
    if (type === 'all')        exportAll(fmt);
    if (type === 'flashcards') exportCards(data, fmt);
    if (type === 'quiz')       exportQuiz(data, fmt);
  });
});

function exportAll(fmt) {
  const date = new Date().toLocaleDateString();
  let content, mime, ext;
  if (fmt === 'json') {
    content = JSON.stringify({ exported: date, ...state }, null, 2);
    mime = 'application/json'; ext = 'json';
  } else if (fmt === 'md') {
    content = `# Noto Export — ${date}\n\n` +
      state.notes.map(n => `## ${n.title||'Untitled'}\n${n.body}`).join('\n\n---\n\n');
    mime = 'text/markdown'; ext = 'md';
  } else if (fmt === 'txt') {
    content = `Noto Export — ${date}\n${'='.repeat(40)}\n\n` +
      state.notes.map(n => `${n.title||'Untitled'}\n${'-'.repeat(30)}\n${n.body}`).join('\n\n');
    mime = 'text/plain'; ext = 'txt';
  } else {
    content = 'Title,Body,Updated\n' +
      state.notes.map(n => `"${(n.title||'').replace(/"/g,'""')}","${(n.body||'').replace(/"/g,'""').slice(0,200)}","${fmtDate(n.updated)}"`).join('\n');
    mime = 'text/csv'; ext = 'csv';
  }
  dl(content, `noto-export.${ext}`, mime);
}

function exportCards(set, fmt) {
  if (!set) return;
  const date = new Date().toLocaleDateString();
  let content, mime, ext;
  if (fmt === 'csv') {
    content = 'Question,Answer\n' + set.cards.map(c => `"${c.q.replace(/"/g,'""')}","${c.a.replace(/"/g,'""')}"`).join('\n');
    mime='text/csv'; ext='csv';
  } else if (fmt === 'json') {
    content = JSON.stringify({ exported: date, set }, null, 2); mime='application/json'; ext='json';
  } else if (fmt === 'md') {
    content = `# ${set.name}\n_${date}_\n\n` + set.cards.map((c,i) => `### Card ${i+1}\n**Q:** ${c.q}\n\n**A:** ${c.a}`).join('\n\n---\n\n');
    mime='text/markdown'; ext='md';
  } else {
    content = `${set.name} — ${date}\n${'─'.repeat(40)}\n\n` + set.cards.map((c,i) => `Card ${i+1}\nQ: ${c.q}\nA: ${c.a}`).join('\n\n');
    mime='text/plain'; ext='txt';
  }
  dl(content, `noto-cards-${set.name}.${ext}`, mime);
}

function exportQuiz(record, fmt) {
  if (!record) return;
  const date = fmtDate(record.date);
  let content, mime, ext;
  if (fmt === 'json') {
    content = JSON.stringify({ exported: date, record }, null, 2); mime='application/json'; ext='json';
  } else if (fmt === 'md') {
    content = `# Quiz: ${record.source}\n_${date} — Score: ${record.correct}/${record.total}_\n\n` +
      record.questions.map((q,i) => `### Q${i+1}: ${q.q}\n` + q.options.map((o,j) => `- ${j===q.answer?'**✓**':'  '} ${o}`).join('\n')).join('\n\n---\n\n');
    mime='text/markdown'; ext='md';
  } else if (fmt === 'csv') {
    content = 'Question,A,B,C,D,Correct\n' + record.questions.map(q =>
      `"${q.q.replace(/"/g,'""')}",` + q.options.map(o=>`"${o.replace(/"/g,'""')}"`).join(',') + `,"${String.fromCharCode(65+q.answer)}"`).join('\n');
    mime='text/csv'; ext='csv';
  } else {
    content = `Quiz: ${record.source} — ${date}\nScore: ${record.correct}/${record.total} (${record.pct}%)\n${'─'.repeat(40)}\n\n` +
      record.questions.map((q,i) => `Q${i+1}: ${q.q}\n` + q.options.map((o,j)=>`  ${j===q.answer?'✓':' '} ${o}`).join('\n')).join('\n\n');
    mime='text/plain'; ext='txt';
  }
  dl(content, `noto-quiz.${ext}`, mime);
}

function dl(content, filename, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename; a.click();
}

/* ═══════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════ */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s='') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}
function logActivity() {
  const key = new Date().toISOString().slice(0, 10);
  state.stats.activityLog[key] = true; save();
}

/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
showView('dashboard');
initSettings();
// Render initial notes list so sidebar is ready
renderNotesList();

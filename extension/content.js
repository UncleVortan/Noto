/* ═══════════════════════════════════════════════════════
   Noto — content.js
   Detects study/article pages and shows a floating pill
   offering: Summarise · Save to Notes · Generate Cards
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Already injected guard ── */
  if (window.__notoInjected) return;
  window.__notoInjected = true;

  /* ── Study page detection ─────────────────────────────
     We look for signals that this is a study-worthy page:
     article/main tags, Wikipedia, doc sites, long content.
  ────────────────────────────────────────────────────── */
  function isStudyPage() {
    const url  = location.hostname;
    const body = document.body;

    // Known study/doc domains
    const studyDomains = [
      'wikipedia.org', 'britannica.com', 'scholarpedia.org',
      'khanacademy.org', 'coursera.org', 'edx.org', 'udemy.com',
      'medium.com', 'substack.com', 'arxiv.org', 'pubmed.ncbi.nlm.nih.gov',
      'docs.google.com', 'notion.so', 'github.com', 'stackoverflow.com',
      'developer.mozilla.org', 'w3schools.com', 'geeksforgeeks.org',
    ];
    if (studyDomains.some(d => url.includes(d))) return true;

    // Page has an <article> or <main> with substantial text
    const article = document.querySelector('article, main, [role="main"], .article-body, .post-content, .entry-content');
    if (article && article.innerText.trim().length > 800) return true;

    // Long page with headings
    const headings = document.querySelectorAll('h1, h2, h3');
    if (headings.length >= 3 && body.innerText.length > 1500) return true;

    return false;
  }

  /* ── Wait for page to settle, then check ── */
  function init() {
    if (!isStudyPage()) return;

    // Don't show on chrome:// or extension pages
    if (location.protocol === 'chrome-extension:') return;

    // Small delay so page is fully rendered
    setTimeout(injectPill, 1200);
  }

  /* ── Inject the floating pill ── */
  function injectPill() {
    if (document.getElementById('noto-pill')) return;

    const pill = document.createElement('div');
    pill.id = 'noto-pill';
    pill.innerHTML = `
      <div id="noto-pill-trigger">
        <span class="noto-icon">◈</span>
        <span class="noto-label">Noto</span>
      </div>
      <div id="noto-pill-menu">
        <div class="noto-menu-title">What would you like to do?</div>
        <button class="noto-action" data-action="summarise">📄 Summarise this page</button>
        <button class="noto-action" data-action="notes">📝 Save summary to Notes</button>
        <button class="noto-action" data-action="cards">🃏 Generate Flashcards</button>
        <div class="noto-result" id="noto-result" style="display:none;"></div>
        <button class="noto-dismiss" id="noto-dismiss">✕ Dismiss</button>
      </div>
    `;
    document.body.appendChild(pill);

    const trigger = document.getElementById('noto-pill-trigger');
    const menu    = document.getElementById('noto-pill-menu');
    const dismiss = document.getElementById('noto-dismiss');
    const result  = document.getElementById('noto-result');

    // Toggle menu
    trigger.addEventListener('click', () => {
      const open = menu.style.display === 'flex';
      menu.style.display = open ? 'none' : 'flex';
    });

    // Dismiss pill entirely
    dismiss.addEventListener('click', () => {
      pill.style.animation = 'noto-fadeOut 0.3s ease forwards';
      setTimeout(() => pill.remove(), 300);
    });

    // Actions
    pill.querySelectorAll('.noto-action').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action, result));
    });
  }

  /* ── Handle actions ── */
  async function handleAction(action, resultEl) {
    const pageText = getPageText();
    if (!pageText) return;

    resultEl.style.display = 'block';
    resultEl.textContent   = '◈ Thinking…';

    try {
      const reply = await chrome.runtime.sendMessage({
        type:   'SM_AI_REQUEST',
        action,
        text:   pageText,
        source: location.hostname,
      });

      if (reply.error) {
        resultEl.textContent = `⚠ ${reply.error}`;
        return;
      }

      if (action === 'summarise') {
        resultEl.textContent = reply.result;
      } else if (action === 'notes') {
        resultEl.textContent = `✓ Summary saved to your Notes!`;
      } else if (action === 'cards') {
        resultEl.textContent = `✓ Flashcards ready — open Noto to view them.`;
      }
    } catch (e) {
      resultEl.textContent = `⚠ ${e.message}`;
    }
  }

  function getPageText() {
    const article = document.querySelector('article, main, [role="main"], .article-body, .post-content');
    const el = article || document.body;
    return el.innerText.slice(0, 5000).trim();
  }

  /* ── Run ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

# Noto

> A free, open-source AI-powered study app that runs entirely in your browser.

**Noto** helps you study smarter — take notes, generate flashcards, run quizzes, chat with your documents, and track your focus sessions. Everything is stored locally in your browser. No account, no server, no data collection.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📝 **Notes** | Full note editor with autosave, search, word count, and file import (.txt, .md) |
| 🃏 **Flashcards** | AI-generated flashcard sets from any note — flip, navigate, export |
| 🎯 **Quiz** | AI-generated multiple-choice quizzes from notes or flashcard sets |
| ⟁ **AI Chat** | Multi-turn chat with optional note context for smarter answers |
| ⏱ **Focus Timer** | Pomodoro, Short, and Deep Work modes with session tracking |
| ◈ **Dashboard** | At-a-glance stats, recent notes, and weekly activity |
| ⬘ **Stats** | Quiz history, focus minutes, flashcard counts, avg scores |
| ⚙ **Settings** | Choose your AI provider, manage data, import/export backups |

---

## 🚀 Getting Started

### Option 1 — Just open it
Download the latest release, unzip it, and open `index.html` in your browser. No install, no server needed.

### Option 2 — Clone and run locally
```bash
git clone https://github.com/YOUR_USERNAME/noto.git
cd noto
# Open index.html in your browser — that's it.
```

### Option 3 — Host it yourself
Upload the three files (`index.html`, `style.css`, `app.js`) to any static hosting service:
- [GitHub Pages](https://pages.github.com)
- [Netlify](https://netlify.com) — drag and drop the folder
- [Vercel](https://vercel.com)
- Any web server

---

## 🤖 AI Setup

Noto supports four AI providers. You only need **one** — pick the one that works for you.

| Provider | Free Tier | Works in EU/Malta | Speed | Get Key |
|---|---|---|---|---|
| **Groq** | ✅ Yes | ✅ Yes | ⚡ Fastest | [console.groq.com](https://console.groq.com) |
| **OpenAI** | ⚠️ Credits only | ✅ Yes | Fast | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Anthropic** | ❌ Paid | ✅ Yes | Fast | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **Cohere** | ✅ Yes | ✅ Yes | Medium | [dashboard.cohere.com](https://dashboard.cohere.com/api-keys) |

> **Recommended for most users:** Groq — completely free, no credit card, works everywhere.

Once you have a key:
1. Open Noto → **Settings**
2. Click your chosen provider
3. Paste your API key → **Save Key**

🔒 **Your API key is stored only in your browser's localStorage. It is never sent to anyone except the AI provider you choose.**

---

## 🏗 How It Works

Noto is intentionally simple:

```
noto/
├── index.html   # All markup and structure
├── style.css    # All styling
└── app.js       # All logic (storage, AI calls, UI)
```

- **No build step.** No npm, no webpack, no framework.
- **No backend.** All data lives in `localStorage`.
- **No tracking.** No analytics, no telemetry, no accounts.
- **No dependencies.** Pure HTML, CSS, and JavaScript.

---

## 📦 Data & Privacy

- All your notes, flashcards, quiz results, and settings are stored in your browser's `localStorage`.
- Nothing is ever sent to any server except direct AI API calls to your chosen provider.
- You can export all your data at any time (Settings → Export) as JSON, Markdown, CSV, or plain text.
- You can import a backup just as easily.

---

## 🤝 Contributing

Contributions are very welcome! Here's how to get started:

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Open a pull request

### Ideas for contributions
- [ ] Dark/light theme toggle
- [ ] Spaced repetition algorithm for flashcards
- [ ] Markdown rendering in notes
- [ ] More export formats (Anki `.apkg`, PDF)
- [ ] Keyboard shortcuts
- [ ] Mobile PWA support
- [ ] More AI providers (Mistral, Ollama local models)
- [ ] Note tagging and folders
- [ ] Browser extension integration

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

---

## 📋 Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and milestones.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

You are free to use, modify, and distribute Noto for any purpose.

---

## 🙏 Acknowledgements

- Fonts: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display), [Syne](https://fonts.google.com/specimen/Syne), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- AI providers: Groq, OpenAI, Anthropic, Cohere

---

<p align="center">Made with ♥ · MIT License · Open Source</p>

# Contributing to Noto

Thank you for wanting to contribute! Noto is intentionally simple — pure HTML, CSS, and JS with no build step — so it's easy to get started.

---

## Philosophy

Before contributing, keep these principles in mind:

- **Zero dependencies.** No npm packages, no frameworks, no build tools.
- **Three files only.** All code lives in `index.html`, `style.css`, and `app.js`.
- **Privacy first.** No new network calls except to AI provider endpoints the user explicitly configures.
- **Works offline.** Everything except AI features must work without an internet connection.

---

## How to Contribute

### 1. Fork & clone
```bash
git clone https://github.com/YOUR_USERNAME/noto.git
cd noto
```

### 2. Make your changes
Open `index.html` in your browser. Refresh to see changes — no build step needed.

### 3. Test manually
- Test all views: Dashboard, Notes, Flashcards, Quiz, AI Chat, Timer, Stats, Settings
- Test with no API key set (graceful error messages)
- Test import/export round-trip
- Test on mobile screen size (resize your browser)

### 4. Open a Pull Request
- Write a clear title and description explaining what you changed and why
- Keep PRs focused — one feature or fix per PR
- If it's a big change, open an issue to discuss it first

---

## Code Style

- Use `const` and `let`, never `var`
- Keep functions short and focused
- Add a comment above any non-obvious logic
- Use the existing `$()` and `qs()` helper functions for DOM access
- Follow the existing naming conventions (`camelCase` for variables, `kebab-case` for CSS classes)
- All CSS class names for new components should be descriptive and scoped (e.g. `.note-editor-bar`, not `.bar`)

---

## Adding an AI Provider

To add a new AI provider:

1. Add its metadata to `PROVIDER_META` in `app.js`
2. Add a `case` in the `aiChat()` switch statement
3. Write a `_providerName(key, sys, usr)` function
4. Add a provider button in `index.html` (Settings section)
5. Add the provider button to the Settings provider grid in `style.css`
6. Update the provider table in `README.md`

---

## Reporting Bugs

Open a GitHub Issue with:
- What you expected to happen
- What actually happened
- Your browser and OS
- Steps to reproduce

---

## Questions

Open a GitHub Discussion or an Issue tagged `question`.

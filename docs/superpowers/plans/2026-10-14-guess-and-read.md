# Guess and Read Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan inline; no delegation is needed for this scoped continuation.

**Goal:** Add useful, offline-ready riddles and short reading to the approved feed.

**Architecture:** Keep the existing ContentBuffer and Store integration. Add a focused data module and a focused renderer/reader module; index.html supplies existing category, heart, and tab hooks. Rebuild the hashed offline shell and distribution packages.

**Tech Stack:** Vanilla JavaScript, HTML/CSS, Python data preparation, Cloudflare Pages.

## Task 1: Content

- [ ] Create `extra-content.js` with stable numeric indices, `id`, `type`, `duanzi`, and riddle/article fields. Riddles contain question, answer, explanation, topic. Articles contain title, author, paragraphs, intro, source URL, revision and license.
- [ ] Add a reproducible authoring/import script under `tools/`; keep source text provenance in `content-sources.json` and `THIRD_PARTY_NOTICES.md`.
- [ ] Reject duplicate questions, empty answers, missing article paragraphs/source/rights. Do not import the academic-only datasets. Use a human-reviewed project-written riddle set and public-domain article pages with documented attribution.

## Task 2: Feed and Reader

- [ ] Create `reading-cards.js` and `reading-cards.css`; expose `ReadingCards.create(item, {footerHtml})`, `ReadingCards.snapshot(item)`, and `ReadingCards.init()`.
- [ ] In `index.html`, add `riddle` and `reading` category rows, local-only buffers using EXTRA_CONTENT, likes filters and full snapshot storage. Dispatch card rendering by type. Existing categories and music remain on their current path.
- [ ] Revealing answers persists a set under `spirit_riddle_revealed_v1`. Copy uses only the question until revelation. Reading uses a native dialog, source links, paragraph text, and a scroll fraction under `spirit_reading_progress_v1`; save when closing and debounce scroll updates. Restore focus and the original page position.
- [ ] Use existing `--bg`, `--text`, `--text-secondary`, `--border`, `--accent` tokens. Preserve keyboard focus, reduced motion and wrapping at 320px.

## Task 3: Offline and Distribution

- [ ] Add the new modules to `starter_data.py` shell list; run the offline-worker builder so sw.js/offline-worker.js share the new hash.
- [ ] Update `work/package-starter-project.py` to inline the modules in HTML and include them in ZIPs. Re-run packaging.
- [ ] Browser verification focuses on meaningful new flows: hidden answers, duplicate-free collection, full snapshot favorites after reload, reader resume/close, mobile overflow, themed rendering and offline loading. Verify old categories and the sixteen local songs still appear.

## Task 4: Release

- [ ] Fetch origin, preserve newer work, commit and push to main using the established release authorization.
- [ ] Copy new modules alongside the existing public release assets; deploy to the existing Pages project. Confirm canonical deployment commit and formal asset delivery; do not describe research sources as integrated music/book tools.

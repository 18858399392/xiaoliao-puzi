# Resource Search Implementation Plan

> Execute inline in the current authorized project, with verification after each task.

**Goal:** Add two independent resource-search entries, using PanSou plugins and PanSearch-specific plugin search with an external search handoff, without Telegram navigation or a local file library.

**Architecture:** resource-search.js owns the modal, query lifecycle, safe normalization and short metadata cache. The existing index.html supplies menu entries. Public PanSou API requests always use src=plugin; the PanSearch entry uses a public-page plugin. functions/api/resource-search.js and lib/resource-proxy.mjs run a fixed-source query endpoint on existing Cloudflare Pages, with safe extraction, source filtering and five-minute nonempty metadata cache.

**Tech Stack:** Vanilla JavaScript, CSS, Fetch, Playwright, existing Python offline packaging and Cloudflare Pages.

- [x] Confirm public API schema/CORS with a real query and PanSearch keyword URL from first-party source.
- [x] Add module helpers and Node checks: request src=plugin; accept only HTTPS allowlisted cloud hosts and plugin: sources; deduplicate; reject tg:, t.me, javascript:, fake subdomains; preserve passwords.
- [x] Implement themed modal with two menu entries, input validation, AbortController, token guard, 20-second timeout, metadata cache, retry, safe external links and copy controls.
- [x] Verify in browser using real and controlled responses: both entries, correct external keyword, no Telegram, result opening/copy, stale completion suppression, empty/error states and responsive widths.
- [x] Add module to starter_data.py shell and work/package-starter-project.py inlining/ZIP; rebuild worker and offline bundles. Update README and usage notes.
- [ ] Run existing reader/music checks with scoped outbound assertions, commit and push main. Deploy exact release assets through cached Wrangler; verify canonical deployment hash and formal browser flows.

Commands: node --test tests/resource-search.test.cjs; node ../verify-resource-search.cjs from project; python -c to call starter_data.build_offline_worker with the existing starter-content.js bundle; python work/package-starter-project.py from workspace. Browser test harness must use an ephemeral local HTTP port and the bundled Playwright Chrome runtime.

# Resource Search Implementation Plan

> Execute inline in the current authorized project, with verification after each task.

**Goal:** Add two independent resource-search entries, using PanSou plugins and a PanSearch external search handoff, without Telegram navigation or a local file library.

**Architecture:** resource-search.js owns the modal, query lifecycle, safe normalization and short metadata cache. The existing index.html supplies menu entries. Public PanSou API requests always use src=plugin; no general proxy or backend deployment is introduced.

**Tech Stack:** Vanilla JavaScript, CSS, Fetch, Playwright, existing Python offline packaging and Cloudflare Pages.

- [ ] Confirm public API schema/CORS with a real query and PanSearch keyword URL from first-party source.
- [ ] Add module helpers and Node checks: request src=plugin; accept only HTTPS allowlisted cloud hosts and plugin: sources; deduplicate; reject tg:, t.me, javascript:, fake subdomains; preserve passwords.
- [ ] Implement themed modal with two menu entries, input validation, AbortController, token guard, 12-second timeout, metadata cache, retry, safe external links and copy controls.
- [ ] Verify in browser using real and controlled responses: both entries, correct external keyword, no Telegram, result opening/copy, stale completion suppression, empty/error states and responsive widths.
- [ ] Add module to starter_data.py shell and work/package-starter-project.py inlining/ZIP; rebuild worker and offline bundles. Update README and usage notes.
- [ ] Run existing reader/music checks with scoped outbound assertions, commit and push main. Deploy exact release assets through cached Wrangler; verify canonical deployment hash and formal browser flows.

Commands: node --test tests/resource-search.test.cjs; node ../verify-resource-search.cjs from project; python -c to call starter_data.build_offline_worker with the existing starter-content.js bundle; python work/package-starter-project.py from workspace. Browser test harness must use an ephemeral local HTTP port and the bundled Playwright Chrome runtime.

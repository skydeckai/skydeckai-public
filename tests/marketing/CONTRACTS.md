# Marketing Site — Functional Contracts

This is the durable specification of what www.skydeck.ai must always let a visitor
do, independent of any design. **Tests enforce these contracts; designs change,
contracts don't.** When a redesign lands and tests fail, the job is to re-anchor the
tests to the new DOM (see `README.md` — usually only `helpers/anchors.ts` changes),
NOT to delete contracts. Removing or weakening a contract requires product-owner
sign-off, recorded here.

| ID | Contract | Spec file |
|----|----------|-----------|
| C1 | The homepage loads with substantial content (not an error/empty shell) | smoke.spec.ts |
| C2 | A visitor can reach the pricing page from the homepage | pricing.spec.ts |
| C3 | The pricing page shows real prices: ≥3 distinct currency amounts and recurring-billing wording | pricing.spec.ts |
| C4 | A visitor can reach a working sign-up form from the homepage (email + password fields + submit) | auth.spec.ts |
| C5 | A visitor can reach a working sign-in form from the homepage (email + password fields + submit) | auth.spec.ts |
| C6 | A visitor can reach the contact page from the homepage | contact.spec.ts |
| C7 | The contact page presents contact channels (Email / Phone / Support labels) and none of its images are broken (contact details are rendered as images today) | contact.spec.ts |
| C8 | The documentation site is linked and reachable | smoke.spec.ts |
| C9 | Every supported language variant of the homepage loads (12 locales) | i18n-live.spec.ts |
| C10 | Language variants are actually translated: CJK/Hangul/Arabic pages contain their script; Latin-language pages differ substantially from English | i18n-live.spec.ts |
| C11 | Every supported language variant of the pricing page loads and shows prices (spot-checked live; full parity via C12) | i18n-live.spec.ts |
| C12 | i18n artifact parity: every locale ships its strings/copy modules and every English legacy-content page exists in all 11 other locales (the translation pipeline may not silently skip pages) | i18n-parity.spec.ts |
| C13 | Each locale page declares its own `lang` attribute (and `/ar/` is `dir="rtl"`) | i18n-live.spec.ts |
| C14 | A visitor can submit the contact form and their message has a path out (API success, or mailto fallback while the endpoint is unreleased) | contact.spec.ts |
| C15 | With consent granted, the page loads analytics without crashing the renderer and PostHog initialises for real (no surviving `_q` stub) | analytics.spec.ts |

## Known product gaps (documented, not asserted)

- ~~No contact form~~ — closed 2026-07-06 by C14 (form + Django endpoint; mailto
  fallback until the backend release ships the endpoint).
- ~~No sitemap.xml / robots.txt~~ — closed by the Astro rebuild (both exist).

## Amendment log

- 2026-07-04 — Initial contracts C1–C13 established against the current Webflow
  export (pre-redesign baseline).
- 2026-07-04 — Astro rebuild (Mado design): C13 promoted from `fixme` to enforced
  (the generator now sets per-locale `lang`/`dir`); C12 re-anchored from the old
  export trees to the new translation artifacts under `site/src/`. Functional
  contracts C1–C11 unchanged — they gated the redesign.
- 2026-07-06 — C7 strengthened: contact details are now real text with a working
  `mailto:` link (all 12 locales). The old anti-scrape images were
  white-on-transparent and unreadable on the new background — an invisibility
  class the "no broken images" check could not detect. The contract now asserts
  the mailto link, a visible phone number, and visible address text.
  NOTE: the phone is plain text by constraint, not choice — GitHub Pages'
  deployment abuse-scanner rejects artifacts containing `tel:` links on these
  pages (proven by A/B bisection against a known-good artifact). If the site
  ever moves behind a host without that scanner, upgrade the phone to `tel:`
  and this contract with it.
- 2026-08-24 — C15 added after production crashed with Chrome "Aw, Snap!"
  (error code 5 = V8 fatal OOM). The PostHog bootstrap replayed its own stub
  queue through `window.posthog`, which array.js adopts instead of replacing,
  so each replayed call re-queued into the array being iterated: ~4 GB in about
  three seconds. Fixed by dropping the stub and the replay loop — nothing on
  the site calls posthog.* before array.js lands, and `capture_pageview`
  covers page views.

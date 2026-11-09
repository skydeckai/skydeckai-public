# Marketing Site Contract Tests

Playwright tests that pin the **functionality** of www.skydeck.ai — pricing
visibility, sign-up/sign-in entry points, contact channels, docs link, and the
12-locale i18n surface — without depending on any particular design. The list of
what's protected lives in [`CONTRACTS.md`](CONTRACTS.md).

## Run

```bash
cd tests/marketing
npm ci
npx playwright install chromium --with-deps
npm test                                   # against production
BASE_URL=https://preview.example npm test  # against a preview/staging deploy
```

CI runs the suite on every pull request against that PR's own build (served
inside the job), and against production after each deploy, daily, and on demand
(`.github/workflows/marketing-tests.yml`, `workflow_dispatch` accepts a
`base_url` input for previews).

## For the agent (or human) whose redesign just broke these tests

These tests are **designed to break loudly and be cheap to re-anchor**. Read this
before touching anything:

1. **Read the failure message.** Every assertion states its contract ID (C1…C13)
   and what functional promise it protects. The message tells you whether you're
   looking at a real regression (function is gone) or an anchoring failure (the
   function moved and the test can't find it).
2. **Re-anchor in ONE place.** All knowledge of the current design lives in
   [`helpers/anchors.ts`](helpers/anchors.ts) — link finders, form-field anchors,
   overlay dismissal, locale URL shape. Update the finder strategies there; the
   spec files should rarely change. Prefer role+name, then href patterns; never
   CSS classes.
3. **Never delete a contract to make CI green.** Contracts only change in
   `CONTRACTS.md` with product-owner sign-off, recorded in its amendment log. If a
   redesign genuinely changes a behavior (e.g. contact info becomes a form),
   *replace* the contract with a stronger one there, then update its spec.
4. **Check the known gaps** in `CONTRACTS.md` before "fixing" something that was
   never there (there is no contact form and no sitemap today, and C13 is a
   documented known-broken `fixme`).
5. **Carry coverage over.** After a redesign, the definition of done is: every
   contract in `CONTRACTS.md` is green against the new design (or formally
   amended) — not that the old selectors were deleted.

## Layout

```
tests/marketing/
├── CONTRACTS.md          the durable functional spec (source of truth)
├── README.md             this file
├── playwright.config.ts  BASE_URL-driven config
├── helpers/anchors.ts    ALL design-coupled selectors/finders (edit here on redesign)
└── contracts/            one spec per contract area
    ├── smoke.spec.ts         C1, C8
    ├── pricing.spec.ts       C2, C3
    ├── auth.spec.ts          C4, C5
    ├── contact.spec.ts       C6, C7
    ├── i18n-live.spec.ts     C9, C10, C11, C13(fixme)
    └── i18n-parity.spec.ts   C12 (repo-level, no browser)
```

/**
 * anchors.ts — the ONLY file that knows how to find things in the current design.
 *
 * Specs express functional contracts (see ../CONTRACTS.md) and call these finders.
 * After a redesign, failing tests point here: update the finder strategies below to
 * re-anchor the same contracts to the new DOM. Prefer, in order:
 *   1. role + accessible name (survives most redesigns)
 *   2. href/url patterns (survives copy changes)
 *   3. text patterns (last resort)
 * Never anchor on CSS classes or DOM structure.
 */
import { expect, Locator, Page } from "@playwright/test";

export const LANGS = [
  "ar", "da", "de", "en", "es", "fr", "ja", "ko", "pt", "vi", "zh-cn", "zh-hk",
] as const;

const reanchor = (what: string) =>
  `\nIf the site was redesigned, this is an ANCHORING failure, not necessarily a ` +
  `functional regression: update the "${what}" finder in tests/marketing/helpers/anchors.ts ` +
  `to locate the same functionality in the new design, keeping the contract intact ` +
  `(tests/marketing/CONTRACTS.md).`;

/** Dismiss any cookie/consent banner that could intercept clicks. Best-effort. */
export async function dismissOverlays(page: Page): Promise<void> {
  const consent = page
    .getByRole("button", { name: /accept|agree|allow all|got it|^ok$/i })
    .first();
  try {
    await consent.click({ timeout: 2500 });
  } catch {
    /* no banner — fine */
  }
}

async function firstVisible(cands: Locator[], what: string): Promise<Locator> {
  for (const cand of cands) {
    const first = cand.first();
    if (await first.isVisible().catch(() => false)) return first;
  }
  throw new Error(`Could not find ${what} on the page.${reanchor(what)}`);
}

/** C2: a link that takes the visitor to pricing. */
export function pricingLink(page: Page): Promise<Locator> {
  return firstVisible(
    [
      page.getByRole("link", { name: /pricing|price/i }),
      page.locator('a[href*="pricing"]'),
    ],
    "pricing link",
  );
}

/** C4: a link that starts sign-up. */
export function signUpLink(page: Page): Promise<Locator> {
  return firstVisible(
    [
      page.getByRole("link", { name: /sign[ -]?up|get started|start free|try free/i }),
      page.locator('a[href*="sign-up"], a[href*="signup"], a[href*="register"]'),
    ],
    "sign-up link",
  );
}

/** C5: a link that starts sign-in. */
export function signInLink(page: Page): Promise<Locator> {
  return firstVisible(
    [
      page.getByRole("link", { name: /sign[ -]?in|log[ -]?in/i }),
      page.locator('a[href*="sign-in"], a[href*="signin"], a[href*="login"]'),
    ],
    "sign-in link",
  );
}

/** C6: a link that reaches the contact page. */
export function contactLink(page: Page): Promise<Locator> {
  return firstVisible(
    [
      page.getByRole("link", { name: /contact/i }),
      page.locator('a[href*="contact"]'),
    ],
    "contact link",
  );
}

/**
 * C8: a link to the documentation site. Presence-only (no visibility
 * requirement) — the current design keeps it inside a dropdown menu.
 */
export function docsLink(page: Page): Locator {
  return page
    .locator('a[href*="docs."], a[href*="documentation"]')
    .or(page.getByRole("link", { name: /doc(s|umentation)/i }))
    .first();
}

/**
 * C4/C5: assert the page we landed on is a usable credentials form.
 * Anchored on semantic input types, not app markup — works for both the
 * server-rendered admin pages and the user workspace SPA (which renders late).
 * The auth pages are SSO-first: the email/password form may sit behind a
 * "Sign in with work email"-style option, so reveal it if needed.
 */
export async function expectAuthForm(page: Page, contract: string): Promise<void> {
  const email = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first();
  const password = page.locator('input[type="password"]').first();

  const revealed = await email
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  if (!revealed) {
    // SSO-first screen: reveal the credentials form. These options are plain
    // clickable elements in the current design, so anchor on their text.
    const reveal = page
      .getByText(/sign (in|up) with (work )?email|continue with (work )?email|use (your )?email/i)
      .first();
    if (await reveal.isVisible().catch(() => false)) {
      await reveal.click();
    }
  }

  // Two legitimate shapes:
  //  (a) a credentials form (email + password + submit) — admin/console pages;
  //  (b) the multi-tenant workspace finder ("Sign in to GenStudio" + a subdomain
  //      field) — user.skydeck.ai's first sign-in step; credentials come on the
  //      org's own subdomain one step later.
  const emailVisible = await email
    .waitFor({ state: "visible", timeout: 25_000 })
    .then(() => true)
    .catch(() => false);

  if (emailVisible) {
    await expect(
      password,
      `${contract}: expected a password field next to the email field on ${page.url()}.${reanchor("auth form (password field)")}`,
    ).toBeVisible({ timeout: 20_000 });
    const submit = page.locator('button[type="submit"], input[type="submit"], form button').first();
    await expect(
      submit,
      `${contract}: expected a submit control on ${page.url()}.${reanchor("auth form (submit)")}`,
    ).toBeVisible();
    return;
  }

  const signInHeading = page.getByRole("heading", { name: /sign in|log in/i }).first();
  const anyField = page
    .locator('input[type="text"], input:not([type]), input[name*="subdomain" i], input[placeholder*="subdomain" i]')
    .first();
  const headingOk = await signInHeading.isVisible().catch(() => false);
  const fieldOk = await anyField.isVisible().catch(() => false);
  if (!(headingOk && fieldOk)) {
    throw new Error(
      `${contract}: ${page.url()} showed neither a credentials form (email+password) nor a ` +
        `workspace-finder sign-in step (a "Sign in…" heading with a subdomain/workspace field). ` +
        `The sign-in entry point is broken or moved.${reanchor("auth form (either shape)")}`,
    );
  }
}

/** Follow a link that may open a new tab (marketing CTAs use target=_blank). */
export async function followLink(page: Page, link: Locator): Promise<Page> {
  const target = await link.getAttribute("target");
  if (target === "_blank") {
    const [popup] = await Promise.all([page.context().waitForEvent("page"), link.click()]);
    await popup.waitForLoadState("domcontentloaded");
    return popup;
  }
  await Promise.all([page.waitForLoadState("domcontentloaded"), link.click()]);
  return page;
}

/** Visible body text (script/style-free) for translation-similarity checks. */
export async function visibleText(page: Page): Promise<string> {
  return (await page.locator("body").innerText()).trim();
}

/** Rough lexical overlap of `text` against English `reference` (0..1). */
export function englishOverlap(reference: string, text: string): number {
  const tokens = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 3),
    );
  const ref = tokens(reference);
  const other = tokens(text);
  if (ref.size === 0) return 0;
  let shared = 0;
  for (const w of other) if (ref.has(w)) shared += 1;
  return shared / ref.size;
}

export const SCRIPT_PATTERNS: Partial<Record<(typeof LANGS)[number], RegExp>> = {
  ja: /[぀-ヿ一-鿿]/g,
  ko: /[가-힯]/g,
  "zh-cn": /[一-鿿]/g,
  "zh-hk": /[一-鿿]/g,
  ar: /[؀-ۿ]/g,
};

/** C17: the hero's product-video picker (one tab per video). */
export function heroVideoTabs(page: Page): Locator {
  return page.getByRole("tablist", { name: /video/i }).getByRole("tab");
}

/** C17: the YouTube player embedded in the hero (privacy-enhanced host only). */
export function heroVideoPlayer(page: Page): Locator {
  return page.locator('iframe[src*="youtube-nocookie.com/embed/"]');
}

/** C17: the hero carousel's previous/next controls. */
export function heroCarouselButton(page: Page, which: "previous" | "next"): Locator {
  return page.getByRole("button", { name: which === "next" ? /^next video$/i : /^previous video$/i });
}

/** C17: the hero carousel's video ids, in play order. */
export async function heroVideoIds(page: Page): Promise<string[]> {
  const ids = await page.locator("[data-hero-videos]").getAttribute("data-ids");
  return (ids ?? "").split(",").filter(Boolean);
}

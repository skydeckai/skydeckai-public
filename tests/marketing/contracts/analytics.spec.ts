import { expect, test } from "@playwright/test";

const ADS_ID = "AW-986099497";
const GA4_ID = "G-0S3DSJDG4H";
const ADS_PIXEL = `https://googleads.g.doubleclick.net/pagead/viewthroughconversion/${ADS_ID.slice(3)}/`;

const grantConsent = () =>
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("sd-consent", "granted");
      } catch {
        /* storage unavailable — the site treats this as no consent */
      }
    });
  });

/**
 * C15 guards the crash fixed on 2026-08-24: the PostHog bootstrap used to
 * install a hand-rolled `_q` stub on window.posthog and replay it after
 * array.js loaded. array.js adopts an existing window.posthog rather than
 * replacing it, so replaying pushed into the array being iterated — an
 * infinite allocating loop that killed the renderer ("Aw, Snap!", V8 OOM).
 * Only visitors with consent granted hit it, which is most returning visitors.
 */
test.describe("analytics", () => {
  grantConsent();

  test("C15: the page survives consent-granted analytics and PostHog loads for real", async ({
    page,
  }) => {
    let crashed = false;
    page.on("crash", () => {
      crashed = true;
    });

    await page.goto("/");
    // array.js is async; give it room to land and run its bootstrap.
    await page.waitForTimeout(8_000);

    expect(
      crashed,
      "C15: the renderer crashed with analytics enabled — the PostHog bootstrap is looping again.",
    ).toBe(false);

    // A live renderer is itself part of the contract: this throws if the tab
    // died, and a wedged main thread never answers.
    const state = await page.evaluate(() => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stubQueue: !!(window as any).posthog?._q,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      loaded: !!(window as any).posthog?.__loaded,
    }));

    expect(
      state.stubQueue,
      "C15: window.posthog still exposes a `_q` queue — the stub survived array.js, which is the exact shape that caused the infinite replay loop.",
    ).toBe(false);
    expect(
      state.loaded,
      "C15: PostHog never finished loading — analytics is silently dead even though the page did not crash.",
    ).toBe(true);
  });
});

/**
 * C16 guards the Google Ads tag on www.skydeck.ai: the campaign landing page
 * must configure AW-986099497 so the click id lands in the _gcl_aw cookie on
 * .skydeck.ai, where admin.skydeck.ai's sign-up conversion reads it back.
 * Also pins the dataLayer push shape — gtag.js only executes `arguments`
 * objects and silently drops real Arrays, so an Array-shaped push is a tag
 * that looks installed and does nothing.
 */
test.describe("google ads", () => {
  grantConsent();

  test("C16: with consent granted the Google Ads tag is configured, accepted, and writes _gcl_aw", async ({
    page,
    context,
    baseURL,
  }) => {
    // gtag.js registers the Ads destination under an internal GT- key, so the
    // proof it accepted the config is the pageview pixel completing — a CSP
    // block still emits the request, so wait for the response, not the request.
    const adsPixel = page.waitForResponse((r) => r.url().startsWith(ADS_PIXEL), { timeout: 15_000 });
    await page.goto("/?gclid=C16TESTCLICK");
    const pixelStatus = await adsPixel.then(
      (r) => r.status(),
      () => -1,
    );

    const state = await page.evaluate(
      ({ adsId, ga4Id }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries: unknown[] = (window as any).dataLayer ?? [];
        const isArgs = (e: unknown) => Object.prototype.toString.call(e) === "[object Arguments]";
        const command = (e: unknown) => (isArgs(e) ? (e as ArrayLike<unknown>) : null);
        return {
          arrayShaped: entries.filter((e) => Array.isArray(e)).length,
          hasJs: entries.some((e) => command(e)?.[0] === "js" && command(e)?.[1] instanceof Date),
          ga4Configured: entries.some((e) => command(e)?.[0] === "config" && command(e)?.[1] === ga4Id),
          adsConfigured: entries.some((e) => command(e)?.[0] === "config" && command(e)?.[1] === adsId),
        };
      },
      { adsId: ADS_ID, ga4Id: GA4_ID },
    );

    expect(
      state.arrayShaped,
      "C16: a gtag command was pushed as a real Array — gtag.js drops those silently, so every command from this shim is lost.",
    ).toBe(0);
    expect(state.hasJs, "C16: gtag('js', new Date()) is missing — gtag.js has no start timestamp.").toBe(true);
    expect(
      state.ga4Configured,
      `C16: no gtag('config', '${GA4_ID}') reached the dataLayer — GA4 now depends entirely on GTM firing it.`,
    ).toBe(true);
    expect(
      state.adsConfigured,
      `C16: no gtag('config', '${ADS_ID}') reached the dataLayer — the Google Ads tag is missing from the site.`,
    ).toBe(true);
    expect(
      pixelStatus,
      `C16: the ${ADS_ID} pageview pixel never completed (status ${pixelStatus}) — the config was pushed but not accepted, or the CSP blocks googleads.g.doubleclick.net.`,
    ).toBeLessThan(400);

    const gcl = (await context.cookies()).find((c) => c.name === "_gcl_aw");
    expect(
      gcl?.value ?? "",
      "C16: the conversion linker did not write _gcl_aw from ?gclid= — sign-ups on admin.skydeck.ai cannot be attributed.",
    ).toContain("C16TESTCLICK");
    if (new URL(baseURL ?? "").hostname.endsWith("skydeck.ai")) {
      expect(
        gcl?.domain,
        "C16: _gcl_aw is not on .skydeck.ai — admin.skydeck.ai cannot read the click id.",
      ).toBe(".skydeck.ai");
    }
  });
});

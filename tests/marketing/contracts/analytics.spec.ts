import { expect, test } from "@playwright/test";

/**
 * C15 guards the crash fixed on 2026-08-24: the PostHog bootstrap used to
 * install a hand-rolled `_q` stub on window.posthog and replay it after
 * array.js loaded. array.js adopts an existing window.posthog rather than
 * replacing it, so replaying pushed into the array being iterated — an
 * infinite allocating loop that killed the renderer ("Aw, Snap!", V8 OOM).
 * Only visitors with consent granted hit it, which is most returning visitors.
 */
test.describe("analytics", () => {
  test("C15: the page survives consent-granted analytics and PostHog loads for real", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("sd-consent", "granted");
      } catch {
        /* storage unavailable — the site treats this as no consent */
      }
    });

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

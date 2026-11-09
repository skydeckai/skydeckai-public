import { expect, Page, test } from "@playwright/test";
import { heroCarouselButton, heroVideoIds, heroVideoPlayer, heroVideoTabs } from "../helpers/anchors";
import { fakeFire, fakeReady, fakeState, useFakeYouTube } from "../helpers/fake-youtube";

const VIDEO_COUNT = 3;
const YOUTUBE_HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com)$/;
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
// YouTube's error codes: owner does not allow embedding; video removed or private.
const NOT_EMBEDDABLE = 150;
const NOT_FOUND = 100;

const embeddedVideoId = async (page: Page) => {
  const src = (await heroVideoPlayer(page).getAttribute("src")) ?? "";
  return src.match(/\/embed\/([\w-]{11})/)?.[1];
};
const selectedIndex = (page: Page) =>
  heroVideoTabs(page).evaluateAll((tabs) => tabs.findIndex((t) => t.getAttribute("aria-selected") === "true"));
const playerShown = (page: Page) =>
  heroVideoPlayer(page).evaluate((f) => {
    const panel = f.closest('[role="tabpanel"]')!;
    const s = getComputedStyle(panel);
    return s.opacity === "1" && s.pointerEvents !== "none";
  });
const storeConsent = (page: Page, entries: Record<string, string>) =>
  page.addInitScript((e) => {
    try {
      for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
    } catch {
      /* storage unavailable — the site treats this as no consent */
    }
  }, entries);
// Accepted on the banner that mentions the videos.
const grantConsent = (page: Page) => storeConsent(page, { "sd-consent": "granted", "sd-consent-video": "granted" });
const panelOpacity = (page: Page) =>
  heroVideoPlayer(page).evaluate((f) => Number(getComputedStyle(f.closest('[role="tabpanel"]')!).opacity));
const youtubeRequestsDuring = async (page: Page, act: () => Promise<void>) => {
  const seen: string[] = [];
  page.on("request", (r) => {
    if (YOUTUBE_HOSTS.test(new URL(r.url()).hostname)) seen.push(r.url());
  });
  await act();
  return seen;
};

test.describe("hero videos", () => {
  test("C17: before consent, the hero offers the product videos without contacting YouTube", async ({
    page,
  }) => {
    const youtubeRequests: string[] = [];
    page.on("request", (r) => {
      if (YOUTUBE_HOSTS.test(new URL(r.url()).hostname)) youtubeRequests.push(r.url());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(heroVideoTabs(page)).toHaveCount(VIDEO_COUNT);
    await expect(heroVideoTabs(page).first()).toHaveAttribute("aria-selected", "true");
    await expect(heroVideoPlayer(page)).toHaveCount(0);
    expect(youtubeRequests, "C17: YouTube was contacted before the visitor consented or chose a video.").toEqual([]);
  });

  test("C17: the hero is a carousel: the next video peeks in beside the current one", async ({ page }) => {
    await page.goto("/");
    const title = async (i: number) => (await heroVideoTabs(page).nth(i).innerText()).trim();
    const current = page.getByRole("button", { name: `Play: ${await title(0)}`, exact: true });
    const next = page.getByRole("button", { name: `Play: ${await title(1)}`, exact: true });

    const a = (await current.boundingBox())!;
    const b = (await next.boundingBox())!;
    const viewport = page.viewportSize()!;
    const nextOpacity = await next.evaluate((el) =>
      Number(getComputedStyle(el.closest('[aria-roledescription="slide"]')!).opacity),
    );

    expect(b.x, "C17: the next video is not to the right of the current one.").toBeGreaterThan(a.x + a.width / 2);
    expect(b.x, "C17: the next video is entirely off screen.").toBeLessThan(viewport.width);
    expect(nextOpacity, "C17: the next video is invisible.").toBeGreaterThan(0);
  });

  test("C17: choosing a video loads that video in the hero", async ({ page }) => {
    await useFakeYouTube(page);
    await page.goto("/");
    const ids = await heroVideoIds(page);

    await heroVideoTabs(page).nth(2).click();
    await expect(heroVideoPlayer(page)).toHaveCount(1);
    expect(await embeddedVideoId(page)).toBe(ids[2]);
    await fakeReady(page);
    await heroVideoTabs(page).first().click();

    await expect(heroVideoTabs(page).first()).toHaveAttribute("aria-selected", "true");
    expect((await fakeState(page))?.current).toBe(ids[0]);
  });

  test("C17: next and previous move between the videos and wrap around", async ({ page }) => {
    await useFakeYouTube(page);
    await page.goto("/");
    const ids = await heroVideoIds(page);

    await heroCarouselButton(page, "next").click();
    await expect.poll(() => selectedIndex(page)).toBe(1);
    await fakeReady(page);
    await heroCarouselButton(page, "next").click();
    await expect.poll(() => selectedIndex(page)).toBe(2);
    await heroCarouselButton(page, "next").click();
    await expect.poll(() => selectedIndex(page)).toBe(0);
    await heroCarouselButton(page, "previous").click();

    await expect.poll(() => selectedIndex(page)).toBe(2);
    expect((await fakeState(page))?.current).toBe(ids[2]);
  });

  test("C17: a choice made while the player is still starting is the video that plays", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await useFakeYouTube(page);
    await grantConsent(page);
    await page.goto("/");
    const ids = await heroVideoIds(page);
    await expect(heroVideoPlayer(page)).toHaveCount(1);

    await heroVideoTabs(page).nth(2).click();
    await fakeReady(page);

    expect(errors).toEqual([]);
    await expect(heroVideoTabs(page).nth(2)).toHaveAttribute("aria-selected", "true");
    expect((await fakeState(page))?.current).toBe(ids[2]);
  });

  test("C17: the player becomes usable once ready, even if the browser blocks it from playing", async ({
    page,
  }) => {
    await useFakeYouTube(page);
    await page.goto("/");
    await heroVideoTabs(page).first().click();
    await expect(heroVideoPlayer(page)).toHaveCount(1);

    await fakeReady(page);

    await expect.poll(() => playerShown(page), { message: "C17: the player stayed hidden, so its own play button is unreachable." }).toBe(true);
  });

  test("C17: when YouTube cannot be reached, choosing a video again retries", async ({ page }) => {
    await page.route("https://www.youtube.com/iframe_api", (r) => r.abort());
    await page.goto("/");
    await heroVideoTabs(page).first().click();
    await expect(heroVideoPlayer(page)).toHaveCount(0);
    await page.unroute("https://www.youtube.com/iframe_api");
    await useFakeYouTube(page);

    await expect(async () => {
      await heroVideoTabs(page).first().click();
      await expect(heroVideoPlayer(page)).toHaveCount(1, { timeout: 1000 });
    }).toPass();
  });


  test("C17: an acceptance from before the banner mentioned the videos does not autoplay them", async ({ page }) => {
    await useFakeYouTube(page);
    await storeConsent(page, { "sd-consent": "granted" });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(heroVideoPlayer(page)).toHaveCount(0);
  });

  test("C17: a stored decline loads nothing from YouTube", async ({ page }) => {
    await storeConsent(page, { "sd-consent": "denied" });

    const requests = await youtubeRequestsDuring(page, async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    expect(requests).toEqual([]);
    await expect(heroVideoPlayer(page)).toHaveCount(0);
  });

  test("C17: declining on the banner loads nothing from YouTube", async ({ page }) => {
    await page.goto("/");

    const requests = await youtubeRequestsDuring(page, async () => {
      await page.getByRole("button", { name: /^decline$/i }).click();
      await page.waitForLoadState("networkidle");
    });

    expect(requests).toEqual([]);
    await expect(heroVideoPlayer(page)).toHaveCount(0);
  });

  test.describe("with consent granted", () => {
    test.beforeEach(async ({ page }) => grantConsent(page));

    test("C17: the first video starts on its own, muted, without CSP violations", async ({ page }) => {
      await page.addInitScript(() => {
        (window as unknown as { __csp: string[] }).__csp = [];
        document.addEventListener("securitypolicyviolation", (e) =>
          (window as unknown as { __csp: string[] }).__csp.push(e.blockedURI),
        );
      });

      await page.goto("/");
      const ids = await heroVideoIds(page);

      await expect(heroVideoPlayer(page)).toHaveCount(1);
      expect(await embeddedVideoId(page)).toBe(ids[0]);
      const src = (await heroVideoPlayer(page).getAttribute("src")) ?? "";
      expect(src).toMatch(/[?&]autoplay=1/);
      expect(src).toMatch(/[?&]mute=1/);
      // Real YouTube may refuse playback on CI machines, and the carousel then skips on, so which
      // tab is selected is checked with the fake player above, not here.
      await page.waitForLoadState("networkidle");
      const blocked = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
      expect(blocked.filter((u) => /youtube|ytimg/.test(u))).toEqual([]);
    });

    test("C17: when a video ends the next one plays, and after the last the first one again", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      const ids = await heroVideoIds(page);
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);

      for (const expected of [1, 2, 0]) {
        await fakeFire(page, "onStateChange", ENDED);
        await expect.poll(() => selectedIndex(page)).toBe(expected);
        expect((await fakeState(page))?.current).toBe(ids[expected]);
      }
    });

    test("C17: a video that cannot play is skipped", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      const ids = await heroVideoIds(page);
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);

      await fakeFire(page, "onError", NOT_EMBEDDABLE);

      await expect.poll(() => selectedIndex(page)).toBe(1);
      expect((await fakeState(page))?.current).toBe(ids[1]);
    });


    test("C17: playing or pausing does not move the carousel on", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);

      await fakeFire(page, "onStateChange", PLAYING);
      await fakeFire(page, "onStateChange", PAUSED);

      expect(await selectedIndex(page)).toBe(0);
      expect((await fakeState(page))?.loaded).toEqual([]);
    });

    test("C17: an error on the last video wraps round to the first", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      const ids = await heroVideoIds(page);
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);
      await heroVideoTabs(page).nth(VIDEO_COUNT - 1).click();

      await fakeFire(page, "onError", NOT_FOUND);

      await expect.poll(() => selectedIndex(page)).toBe(0);
      expect((await fakeState(page))?.current).toBe(ids[0]);
    });

    test("C17: when every video fails, the carousel stops trying", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);

      for (let i = 0; i <= VIDEO_COUNT; i++) await fakeFire(page, "onError", NOT_EMBEDDABLE);

      expect((await fakeState(page))?.loaded).toHaveLength(VIDEO_COUNT - 1);
    });

    test("C17: the player stays hidden until the slides stop, on every move", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);
      // Each move between the 2nd and 3rd videos makes the 1st slide wrap round the back.
      await heroCarouselButton(page, "next").click();
      await fakeFire(page, "onStateChange", PLAYING);
      await expect.poll(() => playerShown(page)).toBe(true);

      await heroCarouselButton(page, "next").click();
      await fakeFire(page, "onStateChange", PLAYING);
      await page.waitForTimeout(200);

      expect(await panelOpacity(page), "C17: the player faded back in while the slides were still moving.").toBeLessThan(0.6);
    });

    test("C17: a video that starts while the hero is scrolled away stays paused", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      await fakeReady(page);

      expect((await fakeState(page))?.paused).toBeGreaterThan(0);
    });

    test("C17: leaving the tab pauses the video", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);

      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect((await fakeState(page))?.paused).toBeGreaterThan(0);
    });

    test("C17: visitors who ask for reduced motion are not autoplayed", async ({ page }) => {
      await useFakeYouTube(page);
      await page.emulateMedia({ reducedMotion: "reduce" });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await expect(heroVideoPlayer(page)).toHaveCount(0);
    });
  });

  test("C17: accepting the banner, which mentions the videos, starts the first video muted", async ({ page }) => {
    await useFakeYouTube(page);
    await page.goto("/");
    const banner = page.getByRole("region", { name: /cookie|consent/i });
    await expect(banner).toContainText(/video/i);

    await page.getByRole("button", { name: /^accept$/i }).click();

    await expect(heroVideoPlayer(page)).toHaveCount(1);
    const src = (await heroVideoPlayer(page).getAttribute("src")) ?? "";
    expect(src).toMatch(/[?&]autoplay=1/);
    expect(src).toMatch(/[?&]mute=1/);
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    const swipe = (page: Page, dx: number, dy: number) =>
      page.evaluate(
        ([dx, dy]) => {
          const target = document.querySelector('[aria-roledescription="carousel"] [aria-roledescription="slide"]')!;
          const r = target.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          const at = (cx: number, cy: number) => new Touch({ identifier: 1, target, clientX: cx, clientY: cy });
          target.dispatchEvent(new TouchEvent("touchstart", { touches: [at(x, y)], changedTouches: [at(x, y)], bubbles: true }));
          target.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [at(x + dx, y + dy)], bubbles: true }));
        },
        [dx, dy] as const,
      );

    test("C17: the video spans most of the screen and the arrows work", async ({ page }) => {
      await page.goto("/");
      const title = (await heroVideoTabs(page).first().innerText()).trim();
      const current = page.getByRole("button", { name: `Play: ${title}`, exact: true });

      const box = (await current.boundingBox())!;
      expect(box.width).toBeGreaterThan(0.8 * page.viewportSize()!.width);
      await heroCarouselButton(page, "next").click();
      await expect.poll(() => selectedIndex(page)).toBe(1);
    });

    test("C17: a sideways swipe changes the video, a scroll does not", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");

      await swipe(page, -60, -140);
      await expect.poll(() => selectedIndex(page)).toBe(0);
      await swipe(page, -120, 10);
      await expect.poll(() => selectedIndex(page)).toBe(1);
    });
  });
});

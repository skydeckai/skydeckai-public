import { expect, Locator, Page, test } from "@playwright/test";
import {
  heroCarouselButton,
  heroSlides,
  heroVideoIds,
  heroVideoPause,
  heroVideoPlayer,
  heroVideoProgress,
  heroVideoSound,
  heroVideoTabs,
} from "../helpers/anchors";
import { fakeFire, fakeMuted, fakePlayhead, fakeReady, fakeState, useFakeYouTube } from "../helpers/fake-youtube";

const VIDEO_COUNT = 3;
const YOUTUBE_HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com)$/;
const UNSTARTED = -1;
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;
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
const currentVideo = async (page: Page) => (await fakeState(page))?.current;
const panelState = (page: Page) =>
  heroVideoPlayer(page).evaluate((f) => {
    const panel = f.closest('[role="tabpanel"]')!;
    const s = getComputedStyle(panel);
    return {
      left: panel.getBoundingClientRect().left,
      opacity: Number(s.opacity),
      hidden: s.opacity === "0" && s.pointerEvents === "none",
    };
  });
// How long the player takes to fade in, and the slides to move, read from the page's own CSS.
const panelFadeMs = (page: Page) =>
  heroVideoPlayer(page).evaluate(
    (f) => parseFloat(getComputedStyle(f.closest('[role="tabpanel"]')!).transitionDuration) * 1000,
  );
const slideMs = (page: Page) =>
  heroSlides(page).first().evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000);
const slideLeft = (page: Page, i: number) =>
  heroSlides(page).nth(i).evaluate((el) => el.getBoundingClientRect().left);
const loaded = async (page: Page) => (await fakeState(page))?.loaded;
// Whether the cursor over the middle of the video reaches YouTube's player (and so its controls).
const cursorReachesYouTube = (page: Page) =>
  heroVideoPlayer(page).evaluate((f) => {
    f.scrollIntoView({ block: "center", behavior: "instant" });
    const r = f.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === f;
  });
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

  test("C17: the slide that wraps round leaves by one edge and comes back in from the other", async ({ page }) => {
    await page.goto("/");
    // The last slide peeks in on the left; moving on sends it round to the right-hand peek.
    const leftPeek = await slideLeft(page, VIDEO_COUNT - 1);
    const rightPeek = await slideLeft(page, 1);

    const move = await heroCarouselButton(page, "next").evaluate((next) => {
      const slides = next.closest('[aria-roledescription="carousel"]')!.querySelectorAll('[aria-roledescription="slide"]');
      const wrapping = slides[slides.length - 1] as HTMLElement;
      const durationMs = parseFloat(getComputedStyle(wrapping).transitionDuration) * 1000;
      (next as HTMLElement).click();
      // What stays behind on the left while the slide itself comes back in on the right.
      const copy = wrapping.previousElementSibling as HTMLElement;
      (window as unknown as { __copy: HTMLElement }).__copy = copy;
      const start = {
        slide: wrapping.getBoundingClientRect().left,
        copy: copy.getAttribute("aria-hidden") === "true" ? copy.getBoundingClientRect().left : null,
        copyInert: copy.inert,
      };
      // Followed frame by frame in the page, so a slow test machine cannot miss the move.
      const copyPath: number[] = [];
      const began = performance.now();
      return new Promise<typeof start & { copyPath: number[] }>((resolve) => {
        const frame = () => {
          if (!copy.isConnected || performance.now() - began > durationMs) return resolve({ ...start, copyPath });
          copyPath.push(copy.getBoundingClientRect().left);
          requestAnimationFrame(frame);
        };
        frame();
      });
    });
    const copyGone = () => page.evaluate(() => !(window as unknown as { __copy: HTMLElement }).__copy.isConnected);

    expect(move.slide, "C17: the wrapping slide appeared in place instead of sliding in.").toBeGreaterThan(rightPeek);
    expect(move.copy, "C17: the wrapping slide vanished from the left instead of sliding out.").toBe(leftPeek);
    expect(move.copyInert, "C17: the slide's departing copy can be clicked or focused.").toBe(true);
    expect(Math.min(...move.copyPath), "C17: the departing copy did not slide out to the left.").toBeLessThan(leftPeek);
    await expect.poll(() => slideLeft(page, VIDEO_COUNT - 1)).toBe(rightPeek);
    await expect.poll(copyGone, { message: "C17: the departing copy was left behind in the page." }).toBe(true);
    await expect(heroSlides(page)).toHaveCount(VIDEO_COUNT);
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
    await expect.poll(() => currentVideo(page)).toBe(ids[0]);
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
    await expect.poll(() => currentVideo(page)).toBe(ids[2]);
  });

  test("C17: several quick moves load only the video they end on, once the slides stop", async ({ page }) => {
    await useFakeYouTube(page);
    await grantConsent(page);
    await page.goto("/");
    const ids = await heroVideoIds(page);
    await expect(heroVideoPlayer(page)).toHaveCount(1);
    await fakeReady(page);

    // Back to back inside the page, so a slow test machine cannot space them a whole slide apart.
    const loadedDuringMoves = await heroCarouselButton(page, "next").evaluate((next) => {
      (next as HTMLElement).click();
      (next as HTMLElement).click();
      return (window as unknown as { __fakeYT: { loaded: string[] } }).__fakeYT.loaded.slice();
    });

    expect(loadedDuringMoves, "C17: a video loaded while the slides were still moving.").toEqual([]);
    await expect.poll(() => loaded(page)).toEqual([ids[2]]);
    await page.waitForTimeout(await slideMs(page));
    expect(await loaded(page), "C17: a video passed over on the way loaded too.").toEqual([ids[2]]);
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
        await expect.poll(() => currentVideo(page)).toBe(ids[expected]);
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
      await expect.poll(() => currentVideo(page)).toBe(ids[1]);
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
      await expect.poll(() => currentVideo(page)).toBe(ids[VIDEO_COUNT - 1]);

      await fakeFire(page, "onError", NOT_FOUND);

      await expect.poll(() => selectedIndex(page)).toBe(0);
      await expect.poll(() => currentVideo(page)).toBe(ids[0]);
    });

    test("C17: when every video fails, the carousel stops trying", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);

      for (let skipped = 1; skipped < VIDEO_COUNT; skipped++) {
        await fakeFire(page, "onError", NOT_EMBEDDABLE);
        await expect.poll(async () => (await fakeState(page))?.loaded.length).toBe(skipped);
      }

      await fakeFire(page, "onError", NOT_EMBEDDABLE);

      expect(await selectedIndex(page)).toBe(VIDEO_COUNT - 1);
      expect((await fakeState(page))?.loaded).toHaveLength(VIDEO_COUNT - 1);
    });

    for (const [move, side] of [
      ["next", -1],
      ["previous", 1],
    ] as const) {
      test(`C17: on ${move}, the playing video slides away with its slide, and the next one shows only once it plays`, async ({
        page,
      }) => {
        await useFakeYouTube(page);
        await page.goto("/");
        const ids = await heroVideoIds(page);
        const arriving = side < 0 ? 1 : VIDEO_COUNT - 1;
        await expect(heroVideoPlayer(page)).toHaveCount(1);
        await fakeReady(page);
        await expect.poll(() => playerShown(page)).toBe(true);
        const centre = (await panelState(page)).left;
        // The video leaves with its slide, which ends up as the neighbour on the far side.
        const neighbour = await slideLeft(page, side < 0 ? VIDEO_COUNT - 1 : 1);
        const travelling = async () => {
          const p = await panelState(page);
          return p.opacity > 0 && (p.left - centre) * side > 0 && (neighbour - p.left) * side > 0;
        };

        await heroCarouselButton(page, move).click();
        expect(await currentVideo(page), "C17: the next video replaced the one on screen before the slides moved.").toBe(ids[0]);
        await expect.poll(travelling, { message: "C17: the video on screen did not travel visibly with its slide." }).toBe(true);
        // The outgoing video may still report that it is playing while it slides away.
        await fakeFire(page, "onStateChange", PLAYING);
        await expect.poll(() => currentVideo(page)).toBe(ids[arriving]);
        // While the next video loads its picture is black.
        await fakeFire(page, "onStateChange", UNSTARTED);
        await fakeFire(page, "onStateChange", BUFFERING);
        await page.waitForTimeout(await panelFadeMs(page));
        expect((await panelState(page)).hidden, "C17: the next video was shown before it started playing.").toBe(true);
        await fakeFire(page, "onStateChange", PLAYING);

        await expect.poll(() => playerShown(page)).toBe(true);
        expect((await panelState(page)).left).toBe(centre);
      });
    }

    test("C17: the outgoing video ending or failing while the slides move does not skip the chosen video", async ({
      page,
    }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      const ids = await heroVideoIds(page);
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);
      await expect.poll(() => playerShown(page)).toBe(true);

      await heroCarouselButton(page, "next").click();
      await fakeFire(page, "onStateChange", ENDED);
      await fakeFire(page, "onError", NOT_FOUND);

      expect(await selectedIndex(page)).toBe(1);
      await expect.poll(() => loaded(page)).toEqual([ids[1]]);
    });

    test("C17: when the next video does not start, pressing it shows the player and plays it", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      const ids = await heroVideoIds(page);
      const title = (await heroVideoTabs(page).nth(1).innerText()).trim();
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);
      await heroCarouselButton(page, "next").click();
      await expect.poll(() => currentVideo(page)).toBe(ids[1]);

      await page.getByRole("button", { name: `Play: ${title}`, exact: true }).click();

      await expect.poll(() => playerShown(page)).toBe(true);
      expect((await fakeState(page))?.played).toBeGreaterThan(0);
    });

    test("C17: the next video's progress bar stays empty until that video has loaded", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);
      await fakePlayhead(page, 30, 60);
      await expect.poll(() => heroVideoProgress(page, 0).evaluate((b) => b.style.transform)).toBe("scaleX(0.5)");
      await heroVideoProgress(page, 1).evaluate((bar) => {
        new MutationObserver(() => {
          const w = window as unknown as { __barFilledAt?: number };
          if (bar.style.transform !== "scaleX(0)") w.__barFilledAt ??= performance.now();
        }).observe(bar, { attributes: true, attributeFilter: ["style"] });
      });

      await heroCarouselButton(page, "next").click();

      await expect.poll(() => heroVideoProgress(page, 1).evaluate((b) => b.style.transform)).toBe("scaleX(0.5)");
      const filledAt = await page.evaluate(() => (window as unknown as { __barFilledAt: number }).__barFilledAt);
      const loadedAt = (await fakeState(page))!.loadedAt[0];
      expect(filledAt, "C17: the bar showed the outgoing video's progress while it slid away.").toBeGreaterThanOrEqual(loadedAt);
    });

    test("C17: hovering a playing video does not bring up YouTube's controls, and pressing it pauses", async ({
      page,
    }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);
      await fakeFire(page, "onStateChange", PLAYING);
      await expect.poll(() => playerShown(page)).toBe(true);

      expect(await cursorReachesYouTube(page), "C17: hovering the playing video brings up YouTube's controls.").toBe(false);
      // Counted from here: the hero may also have been paused while it started below the fold.
      const pausesBefore = (await fakeState(page))!.paused;
      await heroVideoPause(page).click();
      expect((await fakeState(page))?.paused).toBe(pausesBefore + 1);
      await fakeFire(page, "onStateChange", PAUSED);
      expect(await cursorReachesYouTube(page), "C17: YouTube's own controls are out of reach while paused.").toBe(true);
      // Resumed with YouTube's own play button.
      await fakeFire(page, "onStateChange", PLAYING);

      expect(await cursorReachesYouTube(page)).toBe(false);
    });

    test("C17: YouTube's own captions are switched off for each video, as the videos carry their own", async ({
      page,
    }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      const ids = await heroVideoIds(page);
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);

      await fakeFire(page, "onStateChange", PLAYING);
      expect((await fakeState(page))?.unloaded).toEqual(["captions"]);
      await heroCarouselButton(page, "next").click();
      await expect.poll(() => currentVideo(page)).toBe(ids[1]);
      await fakeFire(page, "onStateChange", PLAYING);

      expect((await fakeState(page))?.unloaded).toEqual(["captions", "captions"]);
    });

    test("C17: resuming the same video does not switch its captions off again", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);

      await fakeFire(page, "onStateChange", PLAYING);
      await fakeFire(page, "onStateChange", PAUSED);
      await fakeFire(page, "onStateChange", PLAYING);

      expect((await fakeState(page))?.unloaded, "C17: captions the visitor turned back on were switched off again.").toEqual([
        "captions",
      ]);
    });

    test("C17: the outgoing video starting to play while the slides move does not leave YouTube's captions on the chosen one", async ({
      page,
    }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      const ids = await heroVideoIds(page);
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);
      await fakeFire(page, "onStateChange", BUFFERING);

      await heroCarouselButton(page, "next").click();
      // The first video gets going only now, as it slides away.
      await fakeFire(page, "onStateChange", PLAYING);
      await expect.poll(() => loaded(page)).toEqual([ids[1]]);
      const unloadsBefore = (await fakeState(page))!.unloaded.length;
      await fakeFire(page, "onStateChange", PLAYING);

      expect((await fakeState(page))?.unloaded.length, "C17: the chosen video kept YouTube's captions.").toBe(
        unloadsBefore + 1,
      );
    });

    test("C17: the sound button unmutes the muted video and mutes it again", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);
      await fakeFire(page, "onStateChange", PLAYING);

      await heroVideoSound(page, "unmute").click();
      expect((await fakeState(page))?.muted).toBe(false);
      await heroVideoSound(page, "mute").click();

      expect((await fakeState(page))?.muted).toBe(true);
      await expect(heroVideoSound(page, "unmute")).toBeVisible();
    });

    test("C17: a video that plays with its sound on offers to mute it", async ({ page }) => {
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);
      await fakeMuted(page, false);

      await fakeFire(page, "onStateChange", PLAYING);

      await expect(heroVideoSound(page, "mute")).toBeVisible();
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

    const swipe = (page: Page, dx: number, dy: number, on: Locator = heroSlides(page).first()) =>
      on.evaluate(
        (target, [dx, dy]) => {
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

    test("C17: over a playing video, a swipe changes the video and a tap pauses it", async ({ page }) => {
      await grantConsent(page);
      await useFakeYouTube(page);
      await page.goto("/");
      await expect(heroVideoPlayer(page)).toHaveCount(1);
      await fakeReady(page);
      await fakeFire(page, "onStateChange", PLAYING);
      await expect(heroVideoPause(page)).toBeVisible();
      // Counted from here: the hero may also have been paused while it started.
      const pausesBefore = (await fakeState(page))!.paused;

      await heroVideoPause(page).tap();
      expect((await fakeState(page))?.paused, "C17: tapping the playing video did not pause it.").toBe(pausesBefore + 1);
      expect(await selectedIndex(page)).toBe(0);
      await swipe(page, -120, 10, heroVideoPause(page));

      await expect.poll(() => selectedIndex(page), { message: "C17: swiping across the playing video did nothing." }).toBe(1);
    });
  });
});

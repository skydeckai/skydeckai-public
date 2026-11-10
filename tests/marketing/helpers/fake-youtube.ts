/**
 * A stand-in for YouTube's iframe API, so the hero carousel can be driven deterministically:
 * tests decide when the player is ready and fire its events (a video ending, an error).
 * Like the real API, the playback methods only exist once the player is ready.
 */
import { Page } from "@playwright/test";

const FAKE_API = `
(() => {
  const state = { loaded: [], loadedAt: [], played: 0, paused: 0, time: 0, duration: 0, player: null };
  window.__fakeYT = state;
  window.YT = {
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
    Player: function (el, opts) {
      const frame = document.createElement("iframe");
      const v = opts.playerVars || {};
      frame.src = opts.host + "/embed/" + opts.videoId + "?autoplay=" + v.autoplay + "&mute=" + v.mute;
      el.replaceWith(frame);
      const self = this;
      self.videoId = opts.videoId;
      state.player = self;
      state.ready = () => {
        self.loadVideoById = (id) => { self.videoId = id; state.loaded.push(id); state.loadedAt.push(performance.now()); };
        self.playVideo = () => { state.played++; };
        self.pauseVideo = () => { state.paused++; };
        self.getPlayerState = () => 1;
        self.getCurrentTime = () => state.time;
        self.getDuration = () => state.duration;
        opts.events.onReady && opts.events.onReady({ target: self });
      };
      state.fire = (name, data) => opts.events[name] && opts.events[name]({ target: self, data });
    },
  };
  window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();
})();
`;

export async function useFakeYouTube(page: Page): Promise<void> {
  await page.route("https://www.youtube.com/iframe_api", (r) =>
    r.fulfill({ contentType: "text/javascript", body: FAKE_API }),
  );
  await page.route("https://www.youtube-nocookie.com/**", (r) =>
    r.fulfill({ contentType: "text/html", body: "<!doctype html><title>player</title>" }),
  );
}

type Fake = {
  loaded: string[];
  loadedAt: number[];
  played: number;
  paused: number;
  time: number;
  duration: number;
  player: { videoId: string } | null;
};
export const fakeState = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as { __fakeYT?: Fake }).__fakeYT;
    return s
      ? { loaded: s.loaded, loadedAt: s.loadedAt, played: s.played, paused: s.paused, current: s.player?.videoId }
      : undefined;
  });
/** Where the fake player reports it is in the current video, in seconds. */
export const fakePlayhead = (page: Page, time: number, duration: number) =>
  page.evaluate(
    ([t, d]) => Object.assign((window as unknown as { __fakeYT: Fake }).__fakeYT, { time: t, duration: d }),
    [time, duration] as const,
  );
export const fakeReady = (page: Page) =>
  page.evaluate(() => (window as unknown as { __fakeYT: { ready(): void } }).__fakeYT.ready());
export const fakeFire = (page: Page, name: string, data?: number) =>
  page.evaluate(
    ([n, d]) => (window as unknown as { __fakeYT: { fire(n: string, d?: number): void } }).__fakeYT.fire(n, d),
    [name, data] as const,
  );

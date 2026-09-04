/**
 * Consent-gated analytics bootstrap (bundled external module; CSP allows no
 * inline scripts). Nothing loads until the visitor grants consent — on this
 * page view via the banner's event, or on later views via the stored choice.
 * GTM + GA4 + Google Ads + PostHog (through the t.eastagile.com first-party proxy).
 */
import { ADS_ID, CONSENT_KEY, GA4_ID, GTM_ID, POSTHOG } from "../config/analytics";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    posthog?: { init?: (key: string, config: Record<string, unknown>) => void };
  }
}

let loaded = false;

function loadScript(src: string, onload?: () => void) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  if (onload) s.onload = onload;
  document.head.appendChild(s);
}

function loadAnalytics() {
  if (loaded) return;
  loaded = true;

  // ---- GTM + GA4 ----
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  // gtag.js executes `arguments` objects only; a real Array is dropped silently.
  function gtag(..._args: unknown[]) {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA4_ID);
  gtag("config", ADS_ID);
  loadScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`);

  // ---- PostHog via first-party proxy ----
  // No pre-load stub: array.js defines window.posthog itself, and nothing on
  // the site calls posthog.* before it lands (capture_pageview covers views).
  // A hand-rolled queue here is worse than useless — array.js adopts an
  // existing window.posthog instead of replacing it, so replaying the queue
  // through it re-queues into the array being iterated and spins forever.
  loadScript(`${POSTHOG.assetsHost}/static/array.js`, () => {
    window.posthog?.init?.(POSTHOG.key, {
      api_host: POSTHOG.apiHost,
      ui_host: POSTHOG.uiHost,
      defaults: POSTHOG.defaults,
      person_profiles: "identified_only",
      capture_pageview: true,
    });
  });
}

try {
  if (localStorage.getItem(CONSENT_KEY) === "granted") {
    loadAnalytics();
  }
} catch {
  /* storage unavailable → treat as no consent */
}
window.addEventListener("sd-consent-granted", loadAnalytics);

export {};

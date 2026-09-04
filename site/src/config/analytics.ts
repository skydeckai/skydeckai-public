/**
 * Analytics stack (decisions 2026-07-06/07): GTM + GA4 + PostHog, all loaded
 * only after the visitor accepts the consent banner. Hotjar stays excluded
 * from the CSP — reinstating it is a deliberate change here in code.
 *
 * PostHog runs through the managed first-party reverse proxy
 * (t.eastagile.com), which also serves its static assets; ui_host points
 * toolbar/links back at PostHog US cloud. Project id 502367.
 */
export const POSTHOG = {
  key: "phc_zn9rgisPTk8pZyNRuUdRUdJoSmSUiJvxgcp8um7AVsBH",
  apiHost: "https://t.eastagile.com",
  assetsHost: "https://t.eastagile.com",
  uiHost: "https://us.posthog.com",
  defaults: "2026-05-30",
};

export const GTM_ID = "GTM-N72P33C2";
export const GA4_ID = "G-0S3DSJDG4H";
export const ADS_ID = "AW-986099497";

/** localStorage key for the consent decision: "granted" | "denied". */
export const CONSENT_KEY = "sd-consent";

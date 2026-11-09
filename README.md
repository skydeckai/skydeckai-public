# SkyDeck.ai Public Website

[![deploy-site](https://github.com/skydeckai/skydeckai-public/actions/workflows/deploy-site.yml/badge.svg)](https://github.com/skydeckai/skydeckai-public/actions/workflows/deploy-site.yml)
[![marketing-contract-tests](https://github.com/skydeckai/skydeckai-public/actions/workflows/marketing-tests.yml/badge.svg)](https://github.com/skydeckai/skydeckai-public/actions/workflows/marketing-tests.yml)

The public website of [SkyDeck.ai](https://www.skydeck.ai) — a team of always-on AI agents your business can actually control.

## What SkyDeck.ai offers

**Agent Pods** — persistent cloud workspaces where your agents run. Spin up a pod from GenStudio and choose your agent: Claude Code, OpenClaw, or a custom image built for your team.

- **Always on.** The main terminal outlives your connection — close the tab or your laptop and the agent keeps working. Idle pods auto-sleep to save spend and resume exactly where they left off.
- **Built for teams.** Exactly one person drives the agent at a time; teammates observe every keystroke and take the wheel in a click. Hand off across time zones to keep an agent moving 24/7.
- **Under control.** The Control Center shows every running pod in one screen. Set workspace-wide and per-person spend caps, allocate budget by team, and scope which groups can launch which pods and agents.
- **Nothing lost.** Everything in `/workspace` persists across sessions — plus `~/.claude` in Claude Code pods, so credentials and history carry over.

**GenStudio** — a creative studio for every team. Build generative-AI workflows in a familiar chat interface, invite colleagues into any conversation, share prompts and agents, and launch Agent Pods — all in one governed workspace.

Start at [www.skydeck.ai](https://www.skydeck.ai) — spin up a free workspace for your team today, no credit card, no lock-in. The site is available in 12 languages: English, French, Danish, German, Spanish, Portuguese, Japanese, Korean, Vietnamese, Simplified Chinese, Traditional Chinese, and Arabic.

## About this repository

This repo holds the website itself, published to GitHub Pages:

- `site/` — the [Astro](https://astro.build) app that builds the site. See `site/BUILD-NOTES.md` for the implementation spec.
- `tests/marketing/` — Playwright tests guarding what a visitor must always be able to do (`tests/marketing/CONTRACTS.md`).
- Root locale folders (`en/`, `fr/`, …) — a static export of the previous site, kept for content and URL-parity reference; not deployed.

To work on the site: `cd site && npm install && npm run dev` (Node.js 22.12+), then open `http://localhost:4321`. Pushing to `main` deploys automatically.

To run the contract tests: `cd tests/marketing && npm ci && npx playwright install chromium --with-deps && npm test`. They run against production by default; set `BASE_URL` to point them at a preview deploy. CI runs them on every pull request against the PR's own build, and against production after each deploy and daily.

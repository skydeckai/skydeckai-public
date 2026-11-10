/**
 * All new-design page copy (Home + Agent Pods), one object per locale.
 * Locale files (fr.ts, ja.ts, …) export the same shape translated — keep product
 * names, commands, and mono chips (Claude Code, OpenClaw, claude-code, ⎇ main,
 * /workspace, ~/.claude) untranslated. Headline `italic` is the one
 * accent-italic phrase (Mado §3).
 */
export interface UseCaseCopy {
  anchor: string;
  tab: string;
  icon: string;
  title: string;
  body: string;
  points: { h: string; d: string }[];
}

export interface PricingTierCopy {
  name: string;
  sub: string;
  /** big price in the Standard state ("$19", or "Custom" for Enterprise). Keep the "$" — prices stay USD in every locale. */
  priceStandard: string;
  /** big price in the + Platform credit state ("$29"); omit for the custom/Enterprise tier. */
  priceCredit?: string;
  /** Enterprise: price is inert ("Custom"), the toggle doesn't change it, and the caption is a description. */
  custom?: boolean;
  customCaption?: string;
  /** the dark, "MOST POPULAR" card. */
  highlight?: boolean;
  cta: string;
  ctaKind: "signup" | "contact";
  features: string[];
}

export interface SiteCopy {
  home: {
    metaTitle: string;
    metaDescription: string;
    badge: string;
    h1Pre: string;
    h1Italic: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    heroVideos: {
      label: string;
      play: string;
      previous: string;
      next: string;
      pause: string;
      mute: string;
      unmute: string;
      titles: [string, string, string];
    };
    marqueeLabel: string;
    pillarsEyebrow: string;
    pillarsH2: string;
    pillars: { num: string; title: string; body: string }[];
    productsEyebrow: string;
    productsH2: string;
    genstudio: { eyebrow: string; h3: string; body: string; tags: string[] };
    control: { eyebrow: string; h3: string; body: string; tags: string[] };
    pods: { eyebrow: string; badge: string; h3: string; body: string; cta: string };
    ctaH2: string;
    ctaBody: string;
    ctaPrimary2: string;
    ctaSecondary2: string;
  };
  pods: {
    metaTitle: string;
    metaDescription: string;
    badge: string;
    h1Pre: string;
    h1Italic: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    launchEyebrow: string;
    launchH2: string;
    guideEyebrow: string;
    guideH2: string;
    guide: { icon: string; iconBg: string; title: string; body: string }[];
    useCasesEyebrow: string;
    useCasesH2: string;
    useCases: UseCaseCopy[];
    spendEyebrow: string;
    spendH2: string;
    spendBody: string;
    spend: { icon: string; title: string; body: string }[];
    overseeTitle: string;
    overseeSub: string;
    overseeCols: [string, string, string, string, string];
    statusWords: { running: string; building: string; sleeping: string; stopped: string };
    ctaH2: string;
    ctaBody: string;
    ctaPrimary2: string;
    ctaSecondary2: string;
  };
  pricing: {
    metaTitle: string;
    metaDescription: string;
    eyebrow: string;
    h1: string;
    /** optional accent-italic tail on the headline (Mado §3); en leaves it plain to match the design. */
    h1Italic?: string;
    lede: string;
    toggleStandard: string;
    toggleCredit: string;
    toggleNote: string;
    /** shared card labels */
    perSeatMonthly: string;
    creditCaption: string;
    mostPopular: string;
    tiers: PricingTierCopy[];
    podsSection: {
      eyebrow: string;
      h2: string;
      intro: string;
      bullets: string[];
      foot: string;
      cta: string;
    };
    payg: {
      eyebrow: string;
      h1: string;
      body: string;
      creditEyebrow: string;
      creditAmount: string;
      creditUnit: string;
      creditFeatures: string[];
      creditCta: string;
    };
  };
}

export const copy: SiteCopy = {
  home: {
    metaTitle: "SkyDeck.ai — A team of always-on AI agents your business can actually control",
    metaDescription:
      "Run Claude Code, OpenClaw and more in persistent Agent Pods — teammates collaborating live in the same terminals, every run governed by SkyDeck. Secure, business-first, no vendor lock-in.",
    badge: "Multiple always-on agents · governed & collaborative",
    h1Pre: "A team of always-on AI agents\nyour business can ",
    h1Italic: "actually control.",
    sub: "Run Claude Code, OpenClaw and more in persistent pods — many agents at once, your teammates collaborating live in the same terminals, every run governed by SkyDeck. It's the workflow your engineers already love, made shared, secure, and business-managed.",
    ctaPrimary: "Create Free Workspace",
    ctaSecondary: "Meet Agent Pods →",
    heroVideos: {
      label: "SkyDeck product videos",
      play: "Play",
      previous: "Previous video",
      next: "Next video",
      pause: "Pause video",
      mute: "Mute video",
      unmute: "Unmute video",
      titles: [
        "Preview your app beside the terminal",
        "Take turns driving one agent",
        "Pods ask each other's agents",
      ],
    },
    marqueeLabel: "No vendor lock-in — bring every model",
    pillarsEyebrow: "Three Pillars for Success",
    pillarsH2: "Secure. Collaborate. Customize.",
    pillars: [
      {
        num: "1",
        title: "Security First",
        body: "Robust management and security controls put you in the driver's seat. Encryption in motion and at rest, SSO, DLP and RBAC — admins govern everything from the Control Center.",
      },
      {
        num: "2",
        title: "Built for Teams",
        body: "GenStudio gives every member a workspace to build AI workflows, plus collaboration tools to invite colleagues into conversations. Work together, learn together, ship together.",
      },
      {
        num: "3",
        title: "Customize & Automate",
        body: "Access any LLM, distribute smart prompts, tools and agents to approved teams, and automate repetitive work with routines — all from one intuitive interface.",
      },
    ],
    productsEyebrow: "One platform, three surfaces",
    productsH2: "Create. Curate. Control.",
    genstudio: {
      eyebrow: "GenStudio · Create",
      h3: "A creative studio for every team",
      body: "Build generative-AI workflows in a familiar chat interface. Invite colleagues into any conversation, share prompts and agents, then schedule and automate the work.",
      tags: ["No lock-in", "Team chat", "Prompts & agents", "Schedule & automate", "Slack"],
    },
    control: {
      eyebrow: "Control Center · Curate & Control",
      h3: "Deploy AI safely across the business",
      body: "Curate which teams reach which models, tools, and agents. Encryption in motion and at rest, SSO, DLP, RBAC, and now spend guardrails for running pods.",
      tags: ["SSO", "DLP", "RBAC", "Encryption", "Spend guardrails", "HuggingFace"],
    },
    pods: {
      eyebrow: "Agent Pods",
      badge: "NEW",
      h3: "Persistent workspaces where agents run",
      body: "Launch a cloud pod, drop in Claude Code or OpenClaw, and let it work around the clock. Operate agents together, deploy them to your whole team — all under Control Center spend guardrails.",
      cta: "Explore Agent Pods →",
    },
    ctaH2: "More power. Less risk.",
    ctaBody: "Spin up a free workspace for your team today — no credit card, no lock-in.",
    ctaPrimary2: "Create Free Workspace",
    ctaSecondary2: "Contact Sales",
  },
  pods: {
    metaTitle: "Agent Pods — persistent cloud workspaces where your agents run | SkyDeck.ai",
    metaDescription:
      "Launch a pod, drop in Claude Code or OpenClaw, and let it work around the clock. Operate agents together and roll them out to your whole team — with spend guardrails baked in.",
    badge: "AGENT PODS · GenStudio × Control Center",
    h1Pre: "Persistent cloud workspaces\nwhere your agents ",
    h1Italic: "run the show.",
    sub: "Launch a pod, drop in Claude Code or OpenClaw, and let it work around the clock. Operate agents together and roll them out to your whole team — with spend guardrails baked in.",
    ctaPrimary: "Launch a Pod",
    ctaSecondary: "Read the guide",
    launchEyebrow: "Step one",
    launchH2: "Spin up a pod from a template",
    guideEyebrow: "Anatomy of a pod",
    guideH2: "Launch it once. It keeps working.",
    guide: [
      {
        icon: "🚀",
        iconBg: "#ECEBF3",
        title: "Launch in a click",
        body: "Spin up a pod from GenStudio and choose your agent — Claude Code, OpenClaw, or a custom image.",
      },
      {
        icon: "🖥️",
        iconBg: "#E4E6F0",
        title: "The main terminal survives your disconnects",
        body: "Your primary session keeps running even when you close the tab or your laptop. Extra tabs get a ~45-second grace window before they release.",
      },
      {
        icon: "🌐",
        iconBg: "#E7E5EE",
        title: "Built-in browser pane",
        body: "Preview web apps and let agents drive a real browser on the pod's exposed ports, right beside the terminal.",
      },
      {
        icon: "💤",
        iconBg: "#ECEBF3",
        title: "Sleep & resume",
        body: "Idle pods auto-sleep to save spend and resume exactly where they left off — no lost state.",
      },
      {
        icon: "💾",
        iconBg: "#E4E6F0",
        title: "What persists",
        body: "Everything in /workspace persists across sessions — plus ~/.claude in Claude Code pods, so credentials and history carry over.",
      },
      {
        icon: "🔗",
        iconBg: "#E7E5EE",
        title: "Share & split costs",
        body: "Invite teammates into a pod and see exactly what each run costs, attributed per member and per group.",
      },
    ],
    useCasesEyebrow: "What teams do with Pods",
    useCasesH2: "Three ways to put agents to work",
    useCases: [
      {
        anchor: "run-around-the-clock",
        tab: "Run around the clock",
        icon: "🌙",
        title: "Run AI agents around the clock",
        body: "Kick off a long-running Claude Code session or a detached OpenClaw gateway and let it work while you sleep — auto-sleep and budgets keep it economical.",
        points: [
          { h: "Detached sessions", d: "Claude Code runs in the main terminal that outlives your connection." },
          { h: "OpenClaw gateway", d: "Run openclaw as a detached gateway service other tools can call." },
          { h: "Auto-sleep × budget", d: "Idle pods sleep automatically; spend never runs past your cap." },
          { h: "Resume anytime", d: "Wake the pod and pick up exactly where the agent left off." },
        ],
      },
      {
        anchor: "operate-together",
        tab: "Operate together",
        icon: "🤝",
        title: "Operate an agent together",
        body: "One Driver holds the keyboard at a time while the rest of the team observes live. Hand off control around the globe for true follow-the-sun operation.",
        points: [
          { h: "One Driver at a time", d: "Exactly one person controls the agent — no collisions." },
          { h: "Request / give control", d: "Pass the wheel in a click when it's someone else's turn." },
          { h: "Read-only observers", d: "Teammates watch every keystroke without interfering." },
          { h: "Follow-the-sun", d: "Hand off across time zones to keep an agent moving 24/7." },
        ],
      },
      {
        anchor: "deploy-to-your-team",
        tab: "Deploy to your team",
        icon: "🚀",
        title: "Deploy agents to your whole team",
        body: "Roll out a system pod to everyone, publish custom pods for specific groups, and keep the whole fleet under spend guardrails and live oversight.",
        points: [
          { h: "System pod rollout", d: "Ship a standard, ready-to-run pod to every member." },
          { h: "Custom pods", d: "Build tailored images and publish them to the teams that need them." },
          { h: "Group scoping", d: "Scope which groups can launch which pods and agents." },
          { h: "Fleet oversight", d: "See every running pod and enforce guardrails from one screen." },
        ],
      },
    ],
    spendEyebrow: "Control Center · Pods",
    spendH2: "Oversight without babysitting",
    spendBody:
      "Set a monthly budget and let SkyDeck enforce it. Cap spend per member and per group, limit concurrency, and auto-sleep idle pods — while you watch every running agent from one screen.",
    spend: [
      { icon: "💰", title: "Monthly budget", body: "Set a workspace-wide cap and choose to block, warn, or allow overage when it's hit." },
      { icon: "👤", title: "Per-member caps", body: "Give each person a spend ceiling so no single pod can run away with the budget." },
      { icon: "👥", title: "Per-group caps", body: "Allocate budget by team or group and track burn against each allocation." },
      { icon: "⚡", title: "Concurrent limit", body: "Cap how many pods can run at once to keep load and cost predictable." },
      { icon: "💤", title: "Idle auto-sleep", body: "Automatically sleep pods after a period of inactivity, then resume on demand." },
      { icon: "👁️", title: "Oversee running pods", body: "Live view of every active pod, its driver, agent, and current spend." },
    ],
    overseeTitle: "Oversee running pods",
    overseeSub: "Live view across every team",
    overseeCols: ["Pod", "Agent", "Driver", "Status", "Session"],
    statusWords: { running: "running", building: "building", sleeping: "sleeping", stopped: "stopped" },
    ctaH2: "Put an agent to work tonight.",
    ctaBody: "Launch your first pod in a free workspace. Governed by Control Center from the very first run.",
    ctaPrimary2: "Launch a Pod",
    ctaSecondary2: "← Back to platform",
  },
  pricing: {
    metaTitle: "Pricing — SkyDeck.ai",
    metaDescription:
      "Plans that fit your scale — access all models free for 30 days with your work email, from $19/seat per month. Top up platform credit anytime to run Agent Pods and reach 40+ LLMs.",
    eyebrow: "Pricing",
    h1: "Plans that fit ",
    h1Italic: "your scale",
    lede: "Access all models free for 30 days with your work email. Find your ideal plan starting at $19/month.",
    toggleStandard: "Standard",
    toggleCredit: "+ Platform credit",
    toggleNote: "Add $20/mo credit per seat (+$10) to reach 40+ LLMs.",
    perSeatMonthly: "/seat · monthly",
    creditCaption: "Includes $20/mo platform credit → access to 40+ LLMs",
    mostPopular: "Most popular",
    tiers: [
      {
        name: "Essential",
        sub: "Seats for your team.",
        priceStandard: "$19",
        priceCredit: "$29",
        cta: "Get started",
        ctaKind: "signup",
        features: [
          "GenStudio",
          "Customized User Tools",
          "Control Center to manage workspace",
          "System Tools",
          "Multi-LLM Support",
        ],
      },
      {
        name: "Advance",
        sub: "Seats for your team.",
        priceStandard: "$39",
        priceCredit: "$49",
        highlight: true,
        cta: "Get started",
        ctaKind: "signup",
        features: [
          "Everything in Essential",
          "Invite teammates to your AI chat",
          "Scheduled Tool Automation",
          "Slack Integration",
          "Web Scraping",
        ],
      },
      {
        name: "Enterprise",
        sub: "Customized for your business.",
        priceStandard: "Custom",
        custom: true,
        customCaption: "Volume seats, security & deployment tailored to you.",
        cta: "Contact us",
        ctaKind: "contact",
        features: [
          "Everything in Essential & Advance",
          "Initial Consultation",
          "SSO & SCIM",
          "Data Loss Prevention (DLP)",
          "Dedicated & Private LLMs",
        ],
      },
    ],
    podsSection: {
      eyebrow: "Metered by the hour",
      h2: "Agent Pods pricing",
      intro: "Agent Pods are metered by the hour, on top of your workspace plan — you pay for compute while a pod is awake, and almost nothing while it sleeps.",
      bullets: [
        "Hourly rate set by pod size (vCPU / memory), plus a small surcharge when an agent is attached — the launcher shows the live price before you start.",
        "Sleeping pods keep /workspace and sign-ins intact and bill storage only.",
        "Idle pods auto-sleep on a timer your admin controls.",
        "Monthly budgets, per-member caps, and concurrent-pod limits are enforced in Control Center — overage behavior is your call: block, warn, or allow.",
      ],
      foot: "Pod pricing is managed at the platform level and shown live in the launcher — no separate contract needed.",
      cta: "Meet Agent Pods",
    },
    payg: {
      eyebrow: "Pay as you go",
      h1: "Top up for Agent Pods & premium usage",
      body: "Add platform credit anytime to run Agent Pods around the clock and tap 40+ LLMs beyond your monthly allowance. Credit never expires while your workspace is active — you only pay for what you use.",
      creditEyebrow: "Add credit",
      creditAmount: "$20",
      creditUnit: "blocks · top up any amount",
      creditFeatures: [
        "Fuel always-on Agent Pods",
        "Metered per token — no lock-in",
        "Shared across your workspace",
      ],
      creditCta: "Add credit",
    },
  },
};

export default copy;

/**
 * Everything `/brand/` publishes, in one place: the page renders it,
 * `generated-content.ts` turns it into `/brand/brand.json` for agents,
 * `pnpm brand:art <folder>` draws the derived files (lockups, squares and ad
 * banners) into the CDN folder, and `pnpm brand <folder>` checks that folder
 * against this file, zips it and writes the thumbnails.
 *
 * Full-size files and the zips live on the CDN, never in git. The repo keeps
 * only what the page shows: a WebP thumbnail per raster and the SVGs, which
 * are small, at `public/brand/`, under the same stem as the full file
 * (`/brand/construct-mascot.webp` previews `BRAND_CDN/construct-mascot.png`).
 * The mascot maker works the same way: 512px layers here for the preview,
 * 1024px layers on the CDN for the PNG it saves.
 *
 * Where the files came from, so they can be remade:
 * - Logomark: traced from the avatar-forge silhouette master
 *   (`v2/tools/avatar-forge/masters/base/silhouette.png`, 2048px), eyes drawn
 *   as exact pills from its `frame.json`.
 * - Wordmark and badge: "Construct" + "Computer" outlined from Georgia Italic
 *   at -0.015em tracking, the way the site header sets it.
 * - Lockup, stacked and square marks: composed from the logomark path and
 *   the wordmark SVG by `scripts/brand-art.mjs`, at the geometry below.
 * - Mascot: the forge's base layers (diffuse, gloss, sockets, eyes) composed
 *   at 2048px and trimmed. Maker layers are the agent-avatar 1024 tier.
 * - Hero: a 1920x1080 crop of the YouTube channel art
 *   (`youtube-assets/banner-2560x1440.png`), centred on its text and
 *   mascots, whose box is x 556 to 1998, y 535 to 909. It is the one
 *   full-size cover; partners crop it for their own platforms.
 * - Ad banners: the mascot and the white wordmark on Sky, drawn by
 *   `scripts/brand-art.mjs`.
 * - Launch gallery: the Product Hunt launch slides.
 *
 * Videos are never hosted here: they live on the YouTube channel, and the
 * page links to them with YouTube's own thumbnails, which `pnpm brand` saves.
 */

import type { MascotLayer } from "../features/content/mascot-layers";

export const BRAND_DIR = "/brand";
export const BRAND_CDN = "https://cdn.construct.computer/brand";
/** The day a file on this page last changed; shown so partners know to refresh. */
export const BRAND_UPDATED = "2026-10-25";
export const brandEmail = "hello@construct.computer";

export type BrandFile = {
  readonly format: "SVG" | "PNG" | "JPG";
  /** The full-size file, on the CDN. */
  readonly href: string;
  readonly width: number;
  readonly height: number;
};

/** What a preview sits on, so each variant is shown where it is meant to go. */
export type BrandPlate = "light" | "dark" | "sky" | "photo";

export type BrandAsset = {
  readonly id: string;
  readonly name: string;
  readonly plate: BrandPlate;
  /** In the repo: the SVG itself for vectors, a WebP thumbnail for rasters. */
  readonly preview: string;
  readonly files: readonly BrandFile[];
  /** Where this file goes, for the page and brand.json. */
  readonly use?: string;
};

export type BrandGroup = {
  readonly id: string;
  readonly title: string;
  readonly assets: readonly BrandAsset[];
};

type Size = readonly [width: number, height: number];

const file = (
  id: string,
  format: BrandFile["format"],
  [width, height]: Size,
): BrandFile => ({
  format,
  href: `${BRAND_CDN}/${id}.${format.toLowerCase()}`,
  width,
  height,
});

/** An SVG with a PNG render beside it. */
const vector = (
  id: string,
  name: string,
  plate: BrandPlate,
  svg: Size,
  png?: Size,
  use?: string,
): BrandAsset => ({
  id,
  name,
  plate,
  preview: `${BRAND_DIR}/${id}.svg`,
  files: [file(id, "SVG", svg), ...(png ? [file(id, "PNG", png)] : [])],
  ...(use ? { use } : {}),
});

const raster = (
  id: string,
  name: string,
  plate: BrandPlate,
  format: "PNG" | "JPG",
  size: Size,
  use?: string,
): BrandAsset => ({
  id,
  name,
  plate,
  preview: `${BRAND_DIR}/${id}.webp`,
  files: [file(id, format, size)],
  ...(use ? { use } : {}),
});

/* ------------------------------------------------------------- Geometry */

/**
 * The marks' geometry, shared with `scripts/brand-art.mjs` so the files it
 * draws are exactly the sizes stated here. Units are CSS pixels at 1x.
 */
export const WORDMARK_SVG: Size = [863, 97];
export const WORDMARK_PNG: Size = [2400, 269];
export const LOGOMARK_SVG: Size = [1198, 1170];
export const LOGOMARK_PNG: Size = [1024, 1000];

/** The wordmark's exact box, from its SVG, before rounding. */
export const WORDMARK_BOX = { width: 863.3, height: 96.6 } as const;

/** Logomark beside the wordmark: the mark 1.3 wordmark heights tall. */
export const LOCKUP = {
  markHeight: 126,
  markWidth: 129,
  gap: 44,
  width: 1037,
  height: 126,
  /** Below the box's centre: the descender makes centred text look high. */
  wordmarkNudge: 6,
} as const;
export const LOCKUP_SVG: Size = [LOCKUP.width, LOCKUP.height];
export const LOCKUP_PNG: Size = [2400, 292];

/** Logomark above the wordmark, centred, the mark 2.4 wordmark heights tall. */
export const STACKED = {
  markHeight: 232,
  markWidth: 238,
  gap: 48,
  width: 864,
  height: 377,
} as const;
export const STACKED_SVG: Size = [STACKED.width, STACKED.height];
export const STACKED_PNG: Size = [2400, 1047];

/**
 * The logomark in a square with 16% padding each side, so a circular crop
 * (avatars, grids) still keeps the whole mark.
 */
export const SQUARE = { size: 1024, padding: 164 } as const;
const SQUARE_PX: Size = [SQUARE.size, SQUARE.size];

const SLIDE: Size = [2199, 1316];

export const brandGroups: readonly BrandGroup[] = [
  {
    id: "wordmark",
    title: "Wordmark",
    assets: [
      vector(
        "construct-wordmark",
        "Color",
        "light",
        WORDMARK_SVG,
        WORDMARK_PNG,
        "The logo. Use it wherever it fits.",
      ),
      vector(
        "construct-wordmark-black",
        "Black",
        "light",
        WORDMARK_SVG,
        WORDMARK_PNG,
        "One-color print and light backgrounds where teal clashes.",
      ),
      vector(
        "construct-wordmark-white",
        "White",
        "dark",
        WORDMARK_SVG,
        WORDMARK_PNG,
        "Dark and Sky backgrounds.",
      ),
    ],
  },
  {
    id: "logomark",
    title: "Logomark",
    assets: [
      vector(
        "construct-logomark",
        "Navy",
        "light",
        LOGOMARK_SVG,
        LOGOMARK_PNG,
        "Favicons, app grids and anywhere the wordmark will not fit.",
      ),
      vector(
        "construct-logomark-black",
        "Black",
        "light",
        LOGOMARK_SVG,
        LOGOMARK_PNG,
        "One-color print.",
      ),
      vector(
        "construct-logomark-white",
        "White",
        "dark",
        LOGOMARK_SVG,
        LOGOMARK_PNG,
        "Dark and Sky backgrounds.",
      ),
    ],
  },
  {
    id: "lockup",
    title: "Lockup",
    assets: [
      vector(
        "construct-lockup",
        "Color",
        "light",
        LOCKUP_SVG,
        LOCKUP_PNG,
        "Directory listings and partner pages that ask for the logo with its icon.",
      ),
      vector(
        "construct-lockup-black",
        "Black",
        "light",
        LOCKUP_SVG,
        LOCKUP_PNG,
      ),
      vector("construct-lockup-white", "White", "dark", LOCKUP_SVG, LOCKUP_PNG),
    ],
  },
  {
    id: "stacked",
    title: "Stacked",
    assets: [
      vector(
        "construct-stacked",
        "Color",
        "light",
        STACKED_SVG,
        STACKED_PNG,
        "Tall and square spaces: slides, badges, vertical banners.",
      ),
      vector(
        "construct-stacked-black",
        "Black",
        "light",
        STACKED_SVG,
        STACKED_PNG,
      ),
      vector(
        "construct-stacked-white",
        "White",
        "dark",
        STACKED_SVG,
        STACKED_PNG,
      ),
    ],
  },
  {
    id: "icon",
    title: "Icon and avatar",
    assets: [
      raster(
        "construct-app-icon",
        "App icon",
        "light",
        "PNG",
        [942, 942],
        "App stores and launchers.",
      ),
      vector(
        "construct-mark-square",
        "Square",
        "light",
        SQUARE_PX,
        SQUARE_PX,
        "Product Hunt, G2, AlternativeTo and any square or round logo field.",
      ),
      vector(
        "construct-mark-square-navy",
        "Square on navy",
        "light",
        SQUARE_PX,
        SQUARE_PX,
        "The same for dark grids.",
      ),
      raster(
        "construct-avatar",
        "Avatar",
        "light",
        "PNG",
        [1080, 1080],
        "Social profiles.",
      ),
    ],
  },
  {
    id: "mascot",
    title: "Mascot",
    assets: [
      raster("construct-mascot", "Mascot", "sky", "PNG", [1200, 1171]),
      raster(
        "construct-mascot-happy",
        "Mascot, happy",
        "sky",
        "PNG",
        [1200, 1171],
      ),
    ],
  },
  {
    id: "banner",
    title: "Banner",
    assets: [
      raster(
        "construct-banner-wide",
        "Wide, 16:9",
        "photo",
        "PNG",
        [1920, 1080],
        "Launch posts, link previews, YouTube and any 16:9 cover. Crop it for other shapes.",
      ),
    ],
  },
  {
    id: "launch",
    title: "Launch gallery",
    assets: [
      raster(
        "construct-product-agents",
        "Agents",
        "photo",
        "JPG",
        [2150, 1287],
      ),
      raster("construct-product-workflows", "Workflows", "photo", "JPG", SLIDE),
      raster("construct-product-apps", "App store", "photo", "JPG", SLIDE),
      raster("construct-product-memory", "Memory", "photo", "JPG", SLIDE),
      raster("construct-product-teamwork", "Teamwork", "photo", "JPG", SLIDE),
    ],
  },
  {
    id: "banners",
    title: "Ad banners",
    assets: [
      raster(
        "construct-banner-leaderboard",
        "Leaderboard",
        "photo",
        "PNG",
        [728, 90],
        "Affiliate networks, sidebars and newsletters.",
      ),
      raster(
        "construct-banner-mobile",
        "Mobile banner",
        "photo",
        "PNG",
        [320, 50],
      ),
      raster(
        "construct-banner-rectangle",
        "Medium rectangle",
        "photo",
        "PNG",
        [300, 250],
      ),
      raster(
        "construct-banner-skyscraper",
        "Skyscraper",
        "photo",
        "PNG",
        [160, 600],
      ),
    ],
  },
  {
    id: "badge",
    title: "Badge",
    assets: [
      vector("construct-badge", "Light", "light", [205, 40]),
      vector("construct-badge-dark", "Dark", "dark", [205, 40]),
    ],
  },
];

export function brandGroup(id: string): BrandGroup {
  const group = brandGroups.find((entry) => entry.id === id);
  if (!group) throw new Error(`Unknown brand group: ${id}`);
  return group;
}

/** Every downloadable file, once each, in page order. */
export const brandFiles: readonly BrandFile[] = brandGroups.flatMap((group) =>
  group.assets.flatMap((asset) => asset.files),
);

/* ------------------------------------------------------------------ Kit */

/** The one download: every file on this page, the two PDFs and brand.json. */
export const brandKit = {
  id: "kit",
  name: "Everything",
  filename: "construct-brand-kit.zip",
  href: `${BRAND_CDN}/construct-brand-kit.zip`,
} as const;

export type BrandDocument = {
  readonly id: "guide";
  readonly name: string;
  readonly filename: string;
  readonly href: string;
  readonly use: string;
};

/**
 * The whole page on paper, printed by `pnpm brand` from this file so it can
 * never drift from the page: marks, mascot, colors, type, banners, copy,
 * answers, partner posts and the rules.
 */
export const brandDocument: BrandDocument = {
  id: "guide",
  name: "Brand guide",
  filename: "construct-brand-guide.pdf",
  href: `${BRAND_CDN}/construct-brand-guide.pdf`,
  use: "Everything on the brand page, in one document.",
};

/* ---------------------------------------------------------------- Video */

export const YOUTUBE_CHANNEL = "https://www.youtube.com/@ConstructComputer";

export type BrandVideo = {
  readonly id: string;
  readonly title: string;
  readonly youtubeId: string;
  /** YouTube's own thumbnail, saved into the repo by `pnpm brand`. */
  readonly preview: string;
};

const youtube = (id: string, title: string, youtubeId: string): BrandVideo => ({
  id,
  title,
  youtubeId,
  preview: `${BRAND_DIR}/${id}.webp`,
});

export const brandVideos: readonly BrandVideo[] = [
  youtube("construct-video-launch", "Introducing Construct", "bFFWg69hbGM"),
  youtube(
    "construct-video-headcount",
    "Get More Done Than Your Headcount Allows",
    "Zj8fOPnsNsE",
  ),
  youtube("construct-video-discord", "Construct on Discord", "MLCl0WFxAog"),
];

export const youtubeUrl = (video: BrandVideo) =>
  `https://www.youtube.com/watch?v=${video.youtubeId}`;

/** The player as YouTube gives it, on the cookie-free domain. */
export const youtubeEmbed = (video: BrandVideo) =>
  `<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${video.youtubeId}" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;

/* ------------------------------------------------------------- Logomark */

/**
 * The logomark's path, `public/brand/construct-logomark.svg` inlined, so the
 * page can draw it in any colour for the do and don't examples and the art
 * script can compose the lockups from it.
 */
export const LOGOMARK_VIEWBOX = "0 0 1198 1170";
export const LOGOMARK_PATH =
  "M297.0 1169.3C248.4 1165.5 204.7 1152.2 160.0 1127.6C65.4 1075.4 3.1 974.8 0.3 869.5C-1.4 806.5 6.3 772.3 38.0 701.0C74.8 618.2 78.2 577.5 54.1 509.5C46.9 489.3 36.4 454.5 30.4 431.3C13.4 364.8 19.8 288.8 47.3 231.7C82.4 158.8 139.3 105.5 207.0 82.2C227.7 75.1 240.2 72.9 271.4 71.0C280.7 70.4 294.9 69.5 302.9 69.0C344.4 66.2 374.9 72.5 446.9 98.6C529.0 128.5 553.9 124.6 639.4 69.0C700.1 29.6 757.4 6.5 806.0 2.1C882.2 -4.9 941.9 7.6 1008.1 44.5C1119.8 106.7 1181.8 231.0 1167.1 363.0C1161.2 416.5 1155.2 440.8 1136.2 489.7C1120.6 529.6 1119.1 535.8 1118.3 564.0C1117.2 601.8 1123.3 623.7 1150.2 679.5C1188.5 758.7 1196.7 787.8 1197.7 848.3C1198.3 883.0 1197.5 893.8 1192.8 916.0C1180.7 973.5 1157.8 1019.2 1118.0 1065.4C1049.2 1145.3 932.3 1182.9 818.5 1161.9C780.4 1154.8 761.8 1148.5 700.0 1121.5C660.7 1104.4 657.3 1103.0 649.7 1101.1C628.5 1095.6 590.5 1095.7 566.5 1101.3C544.7 1106.3 538.2 1108.8 511.0 1122.4C474.2 1140.7 443.2 1152.9 417.5 1159.0C384.1 1167.0 328.5 1171.8 297.0 1169.3ZM342 487.0A94.0 94.0 0 0 1 530 487.0V681.0A94.0 94.0 0 0 1 342 681.0ZM669 492.5A94.5 94.5 0 0 1 858 492.5V676.5A94.5 94.5 0 0 1 669 676.5Z";

/* ---------------------------------------------------------------- Color */

export type BrandColor = {
  readonly name: string;
  readonly hex: string;
  readonly use: string;
  /** Text colour that reads on the swatch. */
  readonly on: string;
};

export const brandColors: readonly BrandColor[] = [
  {
    name: "Teal",
    hex: "#01B4C8",
    use: "“Computer”, links, buttons",
    on: "#FFFFFF",
  },
  { name: "Ink", hex: "#4E4646", use: "“Construct”, text", on: "#FFFFFF" },
  { name: "Glass", hex: "#8CB4D3", use: "Mascot", on: "#18325C" },
  { name: "Navy", hex: "#18325C", use: "Logomark, mascot eyes", on: "#FFFFFF" },
  { name: "Sky", hex: "#3F5FC6", use: "Social and launch art", on: "#FFFFFF" },
  { name: "Night", hex: "#081225", use: "Dark backgrounds", on: "#FFFFFF" },
];

export type BrandTypeface = {
  readonly name: string;
  readonly use: string;
  readonly family: string;
  readonly style: "italic" | "normal";
  readonly href?: string;
};

export const brandTypefaces: readonly BrandTypeface[] = [
  {
    name: "Georgia Italic",
    use: "Wordmark",
    family: 'Georgia, "Times New Roman", serif',
    style: "italic",
  },
  {
    name: "Geist",
    use: "Headings",
    family: '"Geist Variable", "Geist", ui-sans-serif, system-ui, sans-serif',
    style: "italic",
    href: "https://vercel.com/font",
  },
  {
    name: "Inter",
    use: "Text",
    family: '"Inter", ui-sans-serif, system-ui, sans-serif',
    style: "normal",
    href: "https://rsms.me/inter/",
  },
];

/* ----------------------------------------------------------------- Name */

export const brandName = {
  full: "Construct Computer",
  short: "Construct",
  domain: "construct.computer",
  /** The full name leads: "Construct" alone finds other products in search. */
  rule: "Construct Computer, in full, in titles, listings and first mentions. Construct on its own in running text after that.",
  wrong: [
    "Construct AI",
    "ConstructComputer",
    "Construct.Computer",
    "Construct Computers",
  ],
  /** Other products that "Construct" alone brings up in search results. */
  collides: ["Construct 3, a game engine", "The Construct, a robotics school"],
} as const;

/* ----------------------------------------------------------------- Copy */

/*
 * Copy to reuse. Written from what the product does today, checked against
 * the pricing and FAQ on this site, and drawn from the launch on Product Hunt
 * and the founder-verified SaaSHub listing, whose older lines (a free plan,
 * launch discounts, a 7-day trial) are deliberately left behind. New users
 * get a free usage allowance (`v2/apps/api/src/domain/billing/free-allowance.ts`);
 * its size is never published, so the copy only says "free credits".
 */

/** Headlines already in use across the site, banners and launch. */
export const brandTaglines = [
  "AI agents that work like hires.",
  "AI employees that work like hires.",
  "Get more done than your headcount allows.",
  "AI agents for startups and small teams.",
  "A team of AI agents that never clock out.",
  "Your AI coworker gets a computer. You get your day back.",
  "Agents figure it out. Workflows lock it in.",
] as const;

/** Product Hunt's tagline field; every tagline above fits it. */
export const TAGLINE_MAX = 60;

export type BrandCopy = {
  readonly id: string;
  readonly label: string;
  readonly text: string;
  /** Where this length is the one asked for. */
  readonly fits: string;
  /** The field's character limit, when there is one. */
  readonly max?: number;
};

/**
 * The same description at each length a form or article asks for. Every one
 * opens with the full name, leads with "AI agents for startups and small
 * teams" and says "its own cloud computer", the phrasing no one else uses.
 */
export const brandDescriptions: readonly BrandCopy[] = [
  {
    id: "one-line",
    label: "One line",
    fits: "Bylines, link lists, anywhere a sentence fits",
    text: "Construct Computer builds AI agents for startups and small teams, each with its own cloud computer.",
  },
  {
    id: "listing",
    label: "Meta description",
    fits: "Meta descriptions, SaaSHub, AlternativeTo, directory summaries",
    max: 160,
    text: "Construct Computer is an AI agent platform for startups and small teams. Each agent has its own cloud computer and does research, outreach, ops and reporting.",
  },
  {
    id: "short",
    label: "Product Hunt description",
    fits: "Product Hunt, app stores, short directory fields",
    max: 260,
    text: "Construct Computer is an AI agent platform for startups and small teams. Each agent works like an AI employee, with its own cloud computer, browser, email and memory, so research, outreach, ops and reporting get done while you're away. Plans from $9 a month.",
  },
  {
    id: "long",
    label: "Overview",
    fits: "G2, Capterra, press boilerplate",
    text: "Construct Computer builds autonomous AI agents for startups and small teams. Each agent works like a hire, with its own role, tools and a persistent cloud computer with a browser, terminal, files, email inbox, memory and schedules, so research, outreach, ops and reporting get done while the team is away. Any MCP server or skill installs as an app, runs that work become shared workflows, and teams reach their agents from the web, Slack, Telegram, Discord and email. Construct Computer was founded in 2026 by Ankush Singh and Nischal Naik, was #1 Product of the Day on Product Hunt in August 2026, and plans start at $9 a month.",
  },
  {
    id: "detailed",
    label: "Detailed",
    fits: "Articles, reviews, newsletters",
    text: [
      "Construct Computer gives startups and small teams an AI workforce instead of a single chat assistant. You set each agent up like a new hire, with a role, instructions and the apps it needs, and it gets its own persistent cloud computer with a browser, terminal, files, email inbox and memory. Agents use that computer the way a person would and keep working on a schedule with your laptop closed, so research, outreach, ops and reporting get done while the team is away.",
      "Any MCP server or skill installs as an app, next to built-in integrations such as Gmail, Notion, GitHub and HubSpot. When the tool you need doesn't exist, an agent writes, tests and publishes it as a private app that Construct Computer hosts. Any run that goes well can be saved as a workflow, put on a schedule and shared with the whole team, so the next run repeats the result instead of reasoning through the job again.",
      "The work stays checkable. Activity records every action and why it happened, and you can inspect, correct or delete anything an agent remembers. Construct Computer was founded in 2026 by Ankush Singh and Nischal Naik and was #1 Product of the Day on Product Hunt in August 2026. Plans start at $9 a month, yearly billing works out to $7.50, $39 and $199 a month, and new users get free credits before subscribing.",
    ].join("\n\n"),
  },
];

export const brandFeatures = [
  "Each agent has its own cloud computer with a browser, terminal, files, email inbox and memory, and uses it the way a person would.",
  "Agents work on their own: they plan the steps, run on a schedule and keep going with your laptop closed.",
  "Any MCP server or skill installs as an app, next to Gmail, Notion, GitHub, HubSpot and more.",
  "Agents build the tools you're missing, and Construct Computer hosts them as private apps.",
  "Runs that work become workflows you can repeat, schedule and share with the team.",
  "Works from the web, Slack, Telegram, Discord or each agent's own email address.",
  "Activity logs every action and why, and memory can be inspected, corrected or deleted.",
] as const;

export type BrandQuestion = {
  readonly question: string;
  readonly answer: string;
};

export const brandFaq: readonly BrandQuestion[] = [
  {
    question: "What is Construct Computer?",
    answer:
      "Construct Computer is an AI agent platform for startups and small teams. Each agent works like a hire, with its own role, tools, memory and a persistent cloud computer, so it can finish research, outreach, ops and reporting on its own and keep going with your laptop closed.",
  },
  {
    question: "Who founded Construct Computer?",
    answer:
      "Ankush Singh and Nischal Naik founded Construct Computer in 2026. It launched on Product Hunt in August 2026 and was #1 Product of the Day.",
  },
  {
    question: "Is Construct Computer the same as Construct 3 or The Construct?",
    answer:
      "No. Construct Computer, at construct.computer, is an AI agent platform for startups and small teams. Construct 3 is a game engine and The Construct is a robotics school. Write the full name, Construct Computer, when you list or link to us, so readers and search engines find the right one.",
  },
  {
    question: "Who is it for?",
    answer:
      "Solo founders, startups and small teams with more recurring work than people to do it. Founders hand off their own research, outreach, ops and reporting, and teams share agents instead of everyone keeping a private chatbot. Non-technical users delegate with a chat or Slack message, and technical teams bring their own MCP servers, skills and model keys.",
  },
  {
    question: "Is Construct Computer an AI employee or an AI agent?",
    answer:
      "Both fit. Each agent is set up like an employee, with a role, instructions and the apps it needs, and works as an autonomous AI agent on its own cloud computer. Directories list Construct Computer under AI agents, AI employees and AI workforce.",
  },
  {
    question: "How is it different from ChatGPT or Claude?",
    answer:
      "Chat assistants are built for answers and drafts inside a thread. Construct Computer is built for work that outlives the thread: it keeps a persistent cloud computer with files, memory and schedules, runs jobs on its own, and records each action in Activity so you can read afterwards what it did and why.",
  },
  {
    question: "How is it different from Zapier, Make or n8n?",
    answer:
      "Zapier, Make and n8n run a fixed trigger-and-action recipe that you build and maintain. A Construct Computer agent plans its own steps across your apps, and once a run works you can lock it in as a workflow that repeats without reasoning through the job again.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Lite is $9 a month ($7.50 billed yearly) with model usage included, up to 2 agents and 3 scheduled tasks. Starter is $59 a month ($39 billed yearly) for up to 5 agents and 10 scheduled tasks. Pro is $299 a month ($199 billed yearly) for up to 15 agents, 50 scheduled tasks and your own model keys. Plans are priced per workspace, not per seat, and Enterprise plans are available.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Yes. New users get free credits to try Construct Computer before choosing a plan. When the credits run out, a subscription keeps your agents working, starting with Lite at $9 a month.",
  },
  {
    question: "Does it keep working when my laptop is closed?",
    answer:
      "Yes. Agents run in the cloud, not on your machine, so scheduled jobs and long runs keep going after you close your laptop. You can open the desktop from any device to watch a run, take over or point it somewhere else.",
  },
  {
    question: "Which apps and channels does it work with?",
    answer:
      "Construct Computer connects to apps from its live integration catalog, including Gmail, Google Calendar, Notion, Linear, Jira, GitHub, HubSpot and Airtable, and you can add your own MCP servers and skills. You can reach your agents from the web app, Slack, Telegram, Discord or each agent's own email address.",
  },
  {
    question: "Can my team share agents?",
    answer:
      "Yes. Workspaces are multiplayer: you invite teammates, set roles and access, and share agents, files, apps and workflows, so the whole team works with the same agents.",
  },
  {
    question: "Can I use my own model keys?",
    answer:
      "On Pro you can add your own keys for OpenRouter, OpenAI, Anthropic, Amazon Bedrock or xAI, and choose whether Construct Computer uses them always or only as a fallback.",
  },
  {
    question: "Can I see and control what it does?",
    answer:
      "Yes. The desktop shows files, live browser activity, terminal transcripts, workflows, memories and tool records. Activity records each action, what it touched, when it ran and why, for the last 30 days. You can interrupt a run, answer its questions, and correct or delete anything it remembers.",
  },
  {
    question: "Do you train on my data?",
    answer:
      "No. You own the files, memories and apps your agents produce, and Construct Computer only stores and processes that content to run the service for you. Stored model keys and bot credentials are encrypted, and closing your account deletes the workspace data.",
  },
];

export type BrandFact = {
  readonly label: string;
  readonly value: string;
  readonly href?: string;
};

export const brandFacts: readonly BrandFact[] = [
  { label: "Website", value: "construct.computer", href: "/" },
  {
    label: "Category",
    value:
      "AI agent platform, listed under AI agents, AI employees and AI workforce",
  },
  {
    label: "Founders",
    value: "Ankush Singh and Nischal Naik, 2026",
    href: "/authors/",
  },
  {
    label: "Launch",
    value: "#1 Product of the Day on Product Hunt, August 2026",
    href: "https://www.producthunt.com/products/construct-computer",
  },
  {
    label: "Pricing",
    value:
      "From $9 a month; $7.50, $39 and $199 a month billed yearly. Free credits to start",
    href: "/pricing/",
  },
  { label: "Works from", value: "Web, Slack, Telegram, Discord, email" },
  { label: "X", value: "@use_construct", href: "https://x.com/use_construct" },
  {
    label: "LinkedIn",
    value: "construct-computer",
    href: "https://linkedin.com/company/construct-computer",
  },
  { label: "YouTube", value: "@ConstructComputer", href: YOUTUBE_CHANNEL },
  {
    label: "GitHub",
    value: "construct-computer",
    href: "https://github.com/construct-computer",
  },
  {
    label: "Discord",
    value: "discord.gg/puArEQHYN9",
    href: "https://discord.gg/puArEQHYN9",
  },
  {
    label: "Contact",
    value: brandEmail,
    href: `mailto:${brandEmail}?subject=Brand%20and%20press`,
  },
];

/* ------------------------------------------------------------- Partners */

/** Stands in for the partner's own tracking link in every template. */
export const AFFILIATE_LINK = "YOUR-LINK";

export const brandDisclosure =
  "I'm a Construct Computer affiliate. If you subscribe through my link, I earn a commission at no extra cost to you.";

/** Posts an affiliate can publish as they are, link swapped in. */
export const brandCaptions: readonly BrandCopy[] = [
  {
    id: "caption-x",
    label: "Short post",
    fits: "X, Threads, Bluesky",
    max: 280,
    text: `I gave an AI agent its own computer. It has a browser, files, email and a schedule, and it finishes the research and reporting while I'm away.\n\nConstruct Computer, from $9 a month: ${AFFILIATE_LINK}`,
  },
  {
    id: "caption-linkedin",
    label: "Longer post",
    fits: "LinkedIn, Facebook, newsletters",
    text: `Most AI tools stop when you close the tab. Construct Computer doesn't.\n\nEach agent gets a real cloud computer with a browser, terminal, files, email inbox and memory, and a schedule to work on. You set it up like a new hire, with a role and the apps it needs, and it keeps going with your laptop closed. When a run works, you save it as a workflow and share it with the team.\n\nPlans start at $9 a month, and new users get free credits to try it: ${AFFILIATE_LINK}`,
  },
];

/** A ready email for a list or a newsletter, link swapped in. */
export const brandEmailTemplate = {
  subject: "An AI hire that keeps working after you log off",
  body: [
    "Hi,",
    "If your week is full of research, outreach, ops and reporting that nobody has time for, this is worth ten minutes.",
    "Construct Computer gives you AI agents that work like hires. Each one gets its own cloud computer with a browser, files, email and memory, plus a schedule, so the work gets done while you're away. Any run that goes well becomes a workflow you can repeat and share with the team.",
    `Plans start at $9 a month, and new users get free credits to try it: ${AFFILIATE_LINK}`,
    brandDisclosure,
  ].join("\n\n"),
} as const;

/** The badge's embed code, linking back with a fixed, non-identifying tag. */
export function badgeSnippet(
  siteUrl: string,
  variant: "construct-badge" | "construct-badge-dark",
) {
  return `<a href="${siteUrl}/?utm_source=badge"><img src="${BRAND_CDN}/${variant}.svg" alt="Construct Computer" width="205" height="40"></a>`;
}

/* ---------------------------------------------------------------- Usage */

export const brandUsage = {
  do: [
    "Use the files from this page as they are",
    "Write Construct Computer in full in titles, listings and first mentions",
    "Keep your own brand more prominent than ours",
    "Give the marks and the mascot room, at least one eye's width",
  ],
  dont: [
    "Stretch, recolor, rotate, outline or retype the marks",
    "Redraw the mascot, change its eyes or add a mouth, arms or legs",
    "Use our names or marks in your own product, company, domain or handle",
    "Suggest that we sponsor or endorse you",
  ],
} as const;

/** The terms in one paragraph, for brand.json and the zip's README. */
export const brandTerms =
  "Construct Computer, Construct, the Construct logo and the mascot are trademarks of Construct Computer. You are welcome to use these files to refer to us: to list, review, write about or link to Construct, to show that your product works with it, and in affiliate promotion. Do not use them in your own product, company or domain names or social handles, to suggest that we sponsor or endorse you, or on merchandise, without asking first. Keep your own brand more prominent than ours. Do not stretch, recolor, rotate or redraw the logo or mascot. We may update this page or withdraw permission for a particular use at any time.";

/* ---------------------------------------------------------------- Mascot */

export type MascotTint =
  | "construct"
  | "azure"
  | "mint"
  | "violet"
  | "amber"
  | "rose"
  | "teal"
  | "coral"
  | "lime";

export const mascotTints: readonly { id: MascotTint; swatch: string }[] = [
  { id: "construct", swatch: "#90B7D5" },
  { id: "azure", swatch: "#9AB3D8" },
  { id: "mint", swatch: "#91BEA3" },
  { id: "violet", swatch: "#B9A9D1" },
  { id: "amber", swatch: "#CEAA89" },
  { id: "rose", swatch: "#D2A2B0" },
  { id: "teal", swatch: "#83BDC3" },
  { id: "coral", swatch: "#D5A499" },
  { id: "lime", swatch: "#BEB286" },
];

/**
 * The product's role presets (`v2/tools/avatar-forge/manifest/presets.ts`)
 * with badges and props left out, which only read at the product's sizes.
 * `wear` sits above the eyes, in the catalog's z order: face, ears, head.
 */
export type MascotRole = {
  readonly id: string;
  readonly label: string;
  readonly outfit: MascotLayer | null;
  readonly wear: readonly MascotLayer[];
};

const role = (
  id: string,
  label: string,
  outfit: MascotLayer | null,
  ...wear: MascotLayer[]
): MascotRole => ({ id, label, outfit, wear });

export const mascotRoles: readonly MascotRole[] = [
  role("plain", "Plain", null),
  role("construction", "Construction", "hi-vis-orange", "hard-hat"),
  role("developer", "Developer", "hoodie-navy", "headphones"),
  role("analyst", "Analyst", "suit-navy-black-tie", "round-glasses-black"),
  role("finance", "Finance", "suit-pinstripe"),
  role("artist", "Artist", "hoodie-cream-splatter", "beret-navy"),
  role("scientist", "Scientist", "lab-coat", "safety-goggles"),
  role("writer", "Writer", "cardigan-brown"),
  role("designer", "Designer", "jacket-cream", "round-glasses-gold"),
  role("support", "Support", "jacket-black", "headset-mic", "cap-black"),
  role("marketing", "Marketing", "jacket-tan"),
  role("business", "Business", "suit-navy"),
  role("planner", "Planner", "zip-jacket-black"),
  role("people", "People", "blazer-pink"),
  role("field-ops", "Field ops", "hi-vis-neon"),
  role("legal", "Legal", "suit-black"),
  role("data", "Data", "sweater-blue", "round-glasses-black"),
];

/** Layers to draw, bottom to top; `pnpm brand:art` assembles them. */
export function mascotLook(
  tint: MascotTint,
  look: MascotRole,
  happy: boolean,
): MascotLayer[] {
  return [
    `body-${tint}` as const,
    "gloss" as const,
    happy ? ("sockets-happy" as const) : ("sockets" as const),
    ...(look.outfit ? [look.outfit] : []),
    happy ? ("eyes-happy" as const) : ("eyes" as const),
    ...look.wear,
  ];
}

/** Pixel size of every assembled mascot: the PNG to download, the WebP to preview. */
export const MASCOT_PX = 1024;
export const MASCOT_PREVIEW_PX = 512;

export type MascotCombo = {
  readonly role: MascotRole;
  readonly tint: MascotTint;
  readonly happy: boolean;
  /** The file name on the CDN, without its extension. */
  readonly stem: string;
};

/**
 * Every way the maker can dress the mascot, assembled by `pnpm brand:art`
 * into `mascot/` on the CDN as a 1024px PNG, previewed on the page from a
 * 512px WebP in the repo. Partners get finished mascots, never the layers.
 */
export const mascotCombos: readonly MascotCombo[] = mascotRoles.flatMap(
  (entry) =>
    mascotTints.flatMap(({ id: tint }) =>
      [false, true].map((happy) => ({
        role: entry,
        tint,
        happy,
        stem: `construct-mascot-${entry.id}-${tint}${happy ? "-happy" : ""}`,
      })),
    ),
);

/** The 1024px PNG on the CDN, the file partners download. */
export const mascotHref = (combo: MascotCombo) =>
  `${BRAND_CDN}/mascot/${combo.stem}.png`;

/** The 512px WebP in the repo, written by `pnpm brand` from that PNG. */
export const mascotPreview = (combo: MascotCombo) =>
  `${BRAND_DIR}/mascot/${combo.stem}.webp`;

export function mascotCombo(
  roleId: string,
  tint: MascotTint,
  happy: boolean,
): MascotCombo {
  const combo = mascotCombos.find(
    (entry) =>
      entry.role.id === roleId && entry.tint === tint && entry.happy === happy,
  );
  if (!combo) throw new Error(`Unknown mascot: ${roleId}, ${tint}`);
  return combo;
}

/**
 * What the kit zip carries: every role with both eye styles in the mascot's
 * own color. All nine colors would add 100MB to the one download; they are
 * on the page and the CDN.
 */
export const kitMascots: readonly MascotCombo[] = mascotCombos.filter(
  (combo) => combo.tint === "construct",
);

/**
 * What a User-Agent header says, in words a person reads at a glance: the
 * device, its OS, the browser, and the app it was opened inside (an investor
 * tapping a link in LinkedIn or X opens it in that app's own browser). The
 * header itself is never kept.
 */
export type DeviceDescription = {
  device: string;
  os?: string;
  browser?: string;
  /** The app whose in-app browser opened the page. */
  app?: string;
  /** A crawler, link previewer, scanner or script rather than a person. */
  bot: boolean;
};

const BOT = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|embedly|preview|scanner|python|curl|wget|go-http|axios|node-fetch/i;

const IN_APP: Array<[string, RegExp]> = [
  ["LinkedIn", /LinkedInApp/i],
  ["X", /\bTwitter/i],
  ["Instagram", /Instagram/i],
  ["Facebook", /FBAN|FBAV|FB_IAB/],
  ["the Google app", /\bGSA\//],
  ["Slack", /\bSlack\//],
  ["Telegram", /Telegram/i],
  ["WhatsApp", /WhatsApp/i],
  ["Discord", /\bDiscord\//],
  ["Snapchat", /Snapchat/i],
  ["LINE", /\bLine\//],
];

const version = (ua: string, pattern: RegExp) => pattern.exec(ua)?.[1];

export function describeDevice(ua: string | null | undefined): DeviceDescription {
  const agent = ua ?? "";
  const bot = !agent || BOT.test(agent);
  const app = IN_APP.find(([, pattern]) => pattern.test(agent))?.[0];

  let device = "Unknown device";
  let os: string | undefined;
  if (/iPad/.test(agent)) {
    device = "iPad";
    os = iosVersion(agent, "iPadOS");
  } else if (/iPhone|iPod/.test(agent)) {
    device = "iPhone";
    os = iosVersion(agent, "iOS");
  } else if (/Android/.test(agent)) {
    device = /Mobile/.test(agent) ? "Android phone" : "Android tablet";
    const v = version(agent, /Android (\d+(?:\.\d+)?)/);
    os = v ? `Android ${v}` : "Android";
  } else if (/CrOS/.test(agent)) {
    device = "Chromebook";
    os = "ChromeOS";
  } else if (/Macintosh|Mac OS X/.test(agent)) {
    device = "Mac";
    os = "macOS";
  } else if (/Windows/.test(agent)) {
    device = "Windows PC";
    os = "Windows";
  } else if (/Linux/.test(agent)) {
    device = "Linux computer";
    os = "Linux";
  }

  return { device, ...(os ? { os } : {}), ...browserOf(agent), ...(app ? { app } : {}), bot };
}

function iosVersion(agent: string, name: string): string {
  const match = /OS (\d+)[_.](\d+)/.exec(agent);
  return match ? `${name} ${match[1]}.${match[2]}` : name;
}

function browserOf(agent: string): { browser?: string } {
  const named: Array<[string, RegExp]> = [
    ["Edge", /Edg(?:A|iOS)?\/(\d+)/],
    ["Opera", /OPR\/(\d+)/],
    ["Samsung Internet", /SamsungBrowser\/(\d+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/(\d+)/],
    ["Chrome", /CriOS\/(\d+)/],
    ["Chrome", /Chrome\/(\d+)/],
    ["Safari", /Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/],
  ];
  for (const [name, pattern] of named) {
    const v = version(agent, pattern);
    if (v) return { browser: `${name} ${v}` };
  }
  return {};
}

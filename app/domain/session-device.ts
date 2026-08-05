import {
  AndroidIcon,
  AppleIcon,
  ArcBrowserIcon,
  BrowserIcon,
  ChromeIcon,
  ComputerIcon,
  LaptopIcon,
  MicrosoftIcon,
  SafariIcon,
  SmartPhone01Icon,
  Tablet01Icon,
  WindowsNewIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { AuthSession, SessionSurface } from "../platform/api/schemas";

const SURFACE_LABEL: Record<SessionSurface, string> = {
  web: "Web",
  mobile_app: "Mobile app",
  desktop_app: "Desktop app",
};

type DeviceClass = "phone" | "tablet" | "laptop" | "desktop" | "unknown";
type BrowserKind =
  | "chrome"
  | "safari"
  | "arc"
  | "edge"
  | "firefox"
  | "unknown";

export type SessionDeviceInfo = {
  icon: IconSvgElement;
  /** Primary row title (browser / OS / surface). */
  label: string;
  browser: BrowserKind;
  deviceClass: DeviceClass;
};

function deviceClassFromUa(ua: string): DeviceClass {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobile|iPhone|iPod|Android.*Mobile/i.test(ua)) return "phone";
  if (/Macintosh|Mac OS X/i.test(ua)) return "laptop";
  if (/Windows|Linux|CrOS/i.test(ua)) return "desktop";
  return "unknown";
}

function browserFromUa(ua: string): BrowserKind {
  // Order matters: Chromium forks advertise Chrome/ too.
  if (/Edg(?:e|A|iOS)?\//i.test(ua)) return "edge";
  if (/\bArc\//i.test(ua)) return "arc";
  if (/Firefox\/|FxiOS\//i.test(ua)) return "firefox";
  if (/Chrome\/|CriOS\//i.test(ua)) return "chrome";
  if (/Safari\//i.test(ua) && /Version\//i.test(ua)) return "safari";
  return "unknown";
}

function osLabel(ua: string): string | null {
  if (/iPhone|iPod/i.test(ua)) return "iOS";
  if (/iPad/i.test(ua)) return "iPadOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return null;
}

function browserLabel(browser: BrowserKind): string | null {
  switch (browser) {
    case "chrome":
      return "Chrome";
    case "safari":
      return "Safari";
    case "arc":
      return "Arc";
    case "edge":
      return "Edge";
    case "firefox":
      return "Firefox";
    default:
      return null;
  }
}

function iconForBrowser(browser: BrowserKind): IconSvgElement | null {
  switch (browser) {
    case "chrome":
      return ChromeIcon;
    case "safari":
      return SafariIcon;
    case "arc":
      return ArcBrowserIcon;
    case "edge":
      return MicrosoftIcon;
    case "firefox":
      return BrowserIcon;
    default:
      return null;
  }
}

function iconForDeviceClass(
  deviceClass: DeviceClass,
  ua: string | null,
): IconSvgElement {
  switch (deviceClass) {
    case "phone":
      if (ua && /Android/i.test(ua)) return AndroidIcon;
      if (ua && /iPhone|iPod/i.test(ua)) return AppleIcon;
      return SmartPhone01Icon;
    case "tablet":
      return Tablet01Icon;
    case "laptop":
      return LaptopIcon;
    case "desktop":
      if (ua && /Windows/i.test(ua)) return WindowsNewIcon;
      return ComputerIcon;
    default:
      return BrowserIcon;
  }
}

function iconForSurface(surface: SessionSurface): IconSvgElement {
  switch (surface) {
    case "mobile_app":
      return SmartPhone01Icon;
    case "desktop_app":
      return ComputerIcon;
    default:
      return BrowserIcon;
  }
}

/** Map an auth session to a Hugeicon + display label from surface / UA. */
export function resolveSessionDevice(
  session: Pick<AuthSession, "surface" | "userAgent" | "deviceLabel">,
): SessionDeviceInfo {
  const ua = session.userAgent?.trim() || null;
  const deviceClass = ua ? deviceClassFromUa(ua) : "unknown";
  const browser = ua && session.surface === "web" ? browserFromUa(ua) : "unknown";

  let icon: IconSvgElement;
  if (session.surface === "mobile_app" || session.surface === "desktop_app") {
    icon = iconForSurface(session.surface);
  } else {
    icon = iconForBrowser(browser) ?? iconForDeviceClass(deviceClass, ua);
  }

  const fromUa = (() => {
    if (!ua) return null;
    const browserName = browserLabel(browser);
    const os = osLabel(ua);
    if (browserName && os) return `${browserName} on ${os}`;
    if (browserName) return browserName;
    if (os) return os;
    return null;
  })();

  const label =
    session.deviceLabel?.trim() ||
    fromUa ||
    SURFACE_LABEL[session.surface] ||
    "Unknown device";

  return { icon, label, browser, deviceClass };
}

export { SURFACE_LABEL };

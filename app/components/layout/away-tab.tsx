import { useEffect } from "react";

const AWAY_TITLE = "Still working while you're away · Construct";
const AWAY_ICON = "/favicon-away.png";

/**
 * While the reader is on another tab, this one says what the product does:
 * its title becomes "Still working while you're away" and its icon the
 * mascot, smiling. Both go back the moment the tab is visible again.
 *
 * The page's own title is read at the moment the tab is hidden, so a route
 * change before that is kept.
 */
export function AwayTab() {
  useEffect(() => {
    let savedTitle: string | null = null;
    let savedIcons: { link: HTMLLinkElement; href: string }[] = [];

    const onChange = () => {
      if (document.visibilityState === "hidden") {
        if (savedTitle !== null) return;
        savedTitle = document.title;
        savedIcons = Array.from(
          document.querySelectorAll<HTMLLinkElement>(
            'link[rel="icon"], link[rel="shortcut icon"]',
          ),
        ).map((link) => ({ link, href: link.href }));
        document.title = AWAY_TITLE;
        for (const { link } of savedIcons) link.href = AWAY_ICON;
      } else if (savedTitle !== null) {
        // A route that changed the title meanwhile wins over the saved one.
        if (document.title === AWAY_TITLE) document.title = savedTitle;
        for (const { link, href } of savedIcons) link.href = href;
        savedTitle = null;
        savedIcons = [];
      }
    };

    document.addEventListener("visibilitychange", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      onChange();
    };
  }, []);

  return null;
}

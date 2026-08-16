import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, Menu, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link, useLocation } from "react-router";

import {
  navItemIsCurrent,
  navLinkIsCurrent,
  primaryNav,
  type NavLink,
  type NavMenu,
} from "../../content/nav";
import { cn } from "../../lib/cn";
import type { AuthUser } from "../../platform/api/schemas";
import { StartCta } from "./start-cta";
import {
  AccountMenuAvatar,
  AccountPanelBody,
  accountDisplayName,
  accountTriggerClassName,
} from "./user-menu";
import "./site-nav.css";

const OPEN_MS = 100;
const CLOSE_MS = 180;
/** Keep in step with `--dur-panel`, which drives the morph in CSS. */
const MORPH_MS = 260;
const EDGE_GUTTER = 16;

type Motion = "pointer" | "keyboard";
type MenuId = NavMenu["id"] | "account";

/**
 * The rail is the whole desktop nav: the triggers, the sliding thumb behind
 * them, and the single dropdown they share. Menus own no open state of their
 * own — one panel exists, and opening a menu moves and resizes it.
 */
type Rail = {
  /** Move the thumb onto an element (pointer entered it). */
  hover: (el: HTMLElement | null) => void;
  /** Send the thumb to the open menu, else the current page, else away. */
  rest: () => void;
  open: (id: MenuId, how: Motion) => void;
  close: (id?: MenuId) => void;
  cancelClose: () => void;
  panelId: string;
};

function canHover(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function MenuChevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      aria-hidden
      data-open={open ? "true" : undefined}
      className="site-nav-chevron size-3 shrink-0"
      strokeWidth={2.5}
    />
  );
}

/** Layout only — colour lives in CSS so `[data-open]` can outrank `[data-current]`. */
const triggerClass =
  "site-nav-trigger inline-flex h-full items-center gap-1 px-3 whitespace-nowrap";

function CurrentTrack() {
  // 2px cyan rule, same idiom as the walkthrough stepper's `.workflow-step-track`.
  return <span aria-hidden className="site-nav-track" />;
}

/** Incoming or exiting copy for the shared rail panel, including Account. */
function RailPanelBody({
  id,
  menus,
  pathname,
  accountUser,
  onNavigate,
}: {
  id: MenuId;
  menus: Map<NavMenu["id"], NavMenu>;
  pathname: string;
  accountUser: AuthUser | null | undefined;
  onNavigate: () => void;
}) {
  if (id === "account") {
    return accountUser ? (
      <AccountPanelBody user={accountUser} onNavigate={onNavigate} />
    ) : null;
  }
  const menu = menus.get(id);
  if (!menu) return null;
  return (
    <MenuPanelContent menu={menu} pathname={pathname} onNavigate={onNavigate} />
  );
}

/**
 * The contents of one menu. Rendered into the shared panel and keyed by menu
 * id, so swapping menus resets the preview and cross-fades the two copies.
 */
function MenuPanelContent({
  menu,
  pathname,
  onNavigate,
}: {
  menu: NavMenu;
  pathname: string;
  onNavigate: () => void;
}) {
  const [preview, setPreview] = useState(0);
  const featured = menu.items[preview] ?? menu.items[0]!;

  return (
    <div
      className={cn(
        menu.kind === "mega"
          ? "flex w-[32rem] gap-2 p-3"
          : "w-max min-w-[13.5rem] p-2",
      )}
    >
      <ul
        className={cn(
          "flex flex-col",
          menu.kind === "mega" && "w-[11.5rem] shrink-0",
        )}
      >
        {menu.items.map((item, index) => {
          const current = navLinkIsCurrent(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                to={item.href}
                aria-current={current ? "page" : undefined}
                data-current={current ? "" : undefined}
                className="site-nav-item flex min-h-9 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium"
                onFocus={() => setPreview(index)}
                onPointerEnter={() => setPreview(index)}
                onClick={onNavigate}
              >
                <span className="min-w-0 truncate">{item.label}</span>
                <span aria-hidden className="site-nav-item-arrow">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {menu.kind === "mega" ? (
        <Link
          to={featured.href}
          onClick={onNavigate}
          className="site-nav-preview min-w-0 flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-3"
        >
          {/* Keyed so highlighting another item fades the whole card instead of
              popping a new image into a fixed frame. */}
          <span key={featured.href} className="site-nav-preview-body block">
            <img
              src={featured.image}
              alt=""
              width="640"
              height="336"
              className="aspect-[1200/630] w-full rounded-lg object-cover"
            />
            <span className="mt-3 block text-[14px] font-semibold leading-5 text-[#4e4646]">
              {featured.label}
            </span>
            {/* Fixed height: descriptions run one to three lines and the panel
                must not resize under the pointer. */}
            <span className="mt-1 line-clamp-3 h-12 text-[12px] leading-4 text-[#627c86]">
              {featured.description}
            </span>
          </span>
        </Link>
      ) : null}
    </div>
  );
}

/** A trigger. The panel it controls belongs to the rail, not to this. */
function DesktopMenu({
  menu,
  pathname,
  open,
  rail,
}: {
  menu: NavMenu;
  pathname: string;
  open: boolean;
  rail: Rail;
}) {
  const openTimer = useRef<number>(0);
  const rootRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = navItemIsCurrent(pathname, menu);

  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  const onPointerEnter = () => {
    if (!canHover()) return;
    rail.hover(triggerRef.current);
    rail.cancelClose();
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      if (!rootRef.current?.matches(":hover")) return;
      rail.open(menu.id, "pointer");
    }, OPEN_MS);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) rail.close(menu.id);
      else rail.open(menu.id, "keyboard");
    }
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      rail.open(menu.id, "keyboard");
    }
  };

  return (
    <li
      ref={rootRef}
      className="flex"
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => window.clearTimeout(openTimer.current)}
    >
      <button
        ref={triggerRef}
        type="button"
        data-nav-trigger=""
        data-current={current ? "" : undefined}
        data-open={open ? "" : undefined}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? rail.panelId : undefined}
        onClick={() => {
          if (open) {
            if (!canHover()) rail.close(menu.id);
            return;
          }
          rail.open(menu.id, canHover() ? "pointer" : "keyboard");
        }}
        onKeyDown={onTriggerKeyDown}
      >
        {menu.label}
        <MenuChevron open={open} />
        {current ? <CurrentTrack /> : null}
      </button>
    </li>
  );
}

function DesktopAccountMenu({
  user,
  open,
  rail,
}: {
  user: AuthUser;
  open: boolean;
  rail: Rail;
}) {
  const openTimer = useRef<number>(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const name = accountDisplayName(user);

  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  const onPointerEnter = () => {
    if (!canHover()) return;
    rail.cancelClose();
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      if (!rootRef.current?.matches(":hover")) return;
      rail.open("account", "pointer");
    }, OPEN_MS);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) rail.close("account");
      else rail.open("account", "keyboard");
    }
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      rail.open("account", "keyboard");
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative flex shrink-0 self-stretch items-center"
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => window.clearTimeout(openTimer.current)}
    >
      <button
        type="button"
        data-nav-trigger=""
        data-thumb-skip=""
        data-open={open ? "" : undefined}
        aria-label={`Account menu for ${name}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? rail.panelId : undefined}
        className={cn("relative z-[1]", accountTriggerClassName)}
        onClick={() => {
          if (open) {
            if (!canHover()) rail.close("account");
            return;
          }
          rail.open("account", canHover() ? "pointer" : "keyboard");
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <AccountMenuAvatar user={user} name={name} />
        <span className="min-w-0 truncate">{name}</span>
        <MenuChevron open={open} />
      </button>
    </div>
  );
}

function DesktopNav({
  pathname,
  accountUser,
}: {
  pathname: string;
  accountUser: AuthUser | null | undefined;
}) {
  const railRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>(0);
  const exitTimer = useRef<number>(0);
  // Mirrors `openId` so the pointer handlers can read it without going stale.
  const openIdRef = useRef<MenuId | null>(null);
  const panelId = useId();

  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  // Owned here so exactly one menu is ever open. Left to themselves, each menu
  // opened on a 100ms timer and closed on a 180ms one, so sweeping across the
  // bar left two panels up at once and left the thumb chasing whichever trigger
  // came first in document order.
  const [openId, setOpenId] = useState<MenuId | null>(null);
  const [exitingId, setExitingId] = useState<MenuId | null>(null);
  const [motion, setMotion] = useState<Motion>("pointer");
  const [morph, setMorph] = useState(false);
  const [box, setBox] = useState<{ x: number; w: number; h: number } | null>(
    null,
  );

  const menus = useMemo(
    () =>
      new Map(
        primaryNav
          .filter((item): item is NavMenu => item.kind !== "link")
          .map((item) => [item.id, item] as const),
      ),
    [],
  );

  const hover = useCallback((el: HTMLElement | null) => {
    const root = railRef.current;
    if (!root || !el) {
      setThumb(null);
      return;
    }
    const item = el.getBoundingClientRect();
    const rail = root.getBoundingClientRect();
    setThumb({ left: item.left - rail.left, width: item.width });
  }, []);

  // Only one menu is open at a time, so `[data-open]` is unambiguous and this
  // no longer depends on the order the triggers happen to sit in.
  const rest = useCallback(() => {
    const root = railRef.current;
    hover(
      root?.querySelector<HTMLElement>(
        "[data-nav-trigger][data-open]:not([data-thumb-skip])",
      ) ??
        root?.querySelector<HTMLElement>("[data-nav-trigger][data-current]") ??
        null,
    );
  }, [hover]);

  const close = useCallback((id?: MenuId) => {
    window.clearTimeout(closeTimer.current);
    // A late close must not shut the neighbour that already took over.
    if (id !== undefined && openIdRef.current !== id) return;
    openIdRef.current = null;
    setOpenId(null);
    setExitingId(null);
    setMorph(false);
    setBox(null);
  }, []);

  const open = useCallback((id: MenuId, how: Motion) => {
    window.clearTimeout(closeTimer.current);
    const curr = openIdRef.current;
    if (curr === id) return;
    setMotion(how);
    // Opening from closed animates the panel in at its final size; moving
    // between menus morphs the panel that is already on screen.
    setMorph(curr !== null);
    if (curr) {
      setExitingId(curr);
      window.clearTimeout(exitTimer.current);
      exitTimer.current = window.setTimeout(() => setExitingId(null), MORPH_MS);
    } else {
      setExitingId(null);
      setBox(null);
    }
    openIdRef.current = id;
    setOpenId(id);
  }, []);

  const cancelClose = useCallback(
    () => window.clearTimeout(closeTimer.current),
    [],
  );

  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => close(), CLOSE_MS);
  }, [close]);

  const rail = useMemo<Rail>(
    () => ({ hover, rest, open, close, cancelClose, panelId }),
    [hover, rest, open, close, cancelClose, panelId],
  );

  /**
   * Size the frame to the live content and place it under its trigger. Same
   * measure-then-animate approach as `AuthPanelFrame`, with x and width added
   * because this panel also travels sideways.
   */
  const measure = useCallback(() => {
    const root = railRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;
    const trigger = root.querySelector<HTMLElement>(
      "[data-nav-trigger][data-open]",
    );
    if (!trigger) return;
    const rail = root.getBoundingClientRect();
    const bounds = trigger.getBoundingClientRect();
    const w = body.offsetWidth;
    const h = body.offsetHeight;
    let x = bounds.left - rail.left;
    // Hang off the trigger's right edge rather than run past the viewport.
    if (rail.left + x + w > window.innerWidth - EDGE_GUTTER) {
      x = bounds.right - rail.left - w;
    }
    setBox({ x: Math.max(x, EDGE_GUTTER - rail.left), w, h });
  }, []);

  // Before paint, so the panel never shows at the wrong size for a frame.
  useLayoutEffect(() => {
    if (!openId) return;
    measure();
  }, [openId, measure]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!openId || !body) return;
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [openId, measure]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: Event) => {
      if ((event as globalThis.KeyboardEvent).key === "Escape") close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (railRef.current?.contains(event.target as Node)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openId, close]);

  useEffect(() => {
    rest();
    // The first park is a jump, not a slide from the left edge.
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, [rest, pathname, openId]);

  useEffect(() => {
    const onResize = () => {
      rest();
      measure();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [rest, measure]);

  // Label widths move once the webfont lands; re-measure rather than sit askew.
  useEffect(() => {
    void document.fonts?.ready.then(rest);
  }, [rest]);

  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(exitTimer.current);
    },
    [],
  );

  return (
    <nav
      ref={railRef}
      aria-label="Primary"
      className="site-nav-rail ml-auto hidden self-stretch gap-2 text-[13px] lg:flex"
      onPointerEnter={cancelClose}
      onPointerLeave={() => {
        rest();
        scheduleClose();
      }}
    >
      <span
        aria-hidden
        className="site-nav-thumb"
        data-ready={ready ? "" : undefined}
        data-visible={thumb ? "" : undefined}
        style={
          thumb
            ? {
                width: `${thumb.width}px`,
                transform: `translateX(${thumb.left}px)`,
              }
            : undefined
        }
      />
      <ul className="flex h-full items-stretch">
        {primaryNav.map((item) =>
          item.kind === "link" ? (
            <li key={item.href} className="flex">
              <Link
                to={item.href}
                data-nav-trigger=""
                data-current={navItemIsCurrent(pathname, item) ? "" : undefined}
                aria-current={
                  navLinkIsCurrent(pathname, item.href) ? "page" : undefined
                }
                className={triggerClass}
                onPointerEnter={(event) => {
                  if (!canHover()) return;
                  rail.hover(event.currentTarget);
                  // A plain link has nothing to open, so the panel that is up
                  // belongs to a menu the pointer has now left.
                  scheduleClose();
                }}
              >
                {item.label}
                {navItemIsCurrent(pathname, item) ? <CurrentTrack /> : null}
              </Link>
            </li>
          ) : (
            <DesktopMenu
              key={item.id}
              menu={item}
              pathname={pathname}
              open={openId === item.id}
              rail={rail}
            />
          ),
        )}
      </ul>
      {accountUser ? (
        <DesktopAccountMenu
          user={accountUser}
          open={openId === "account"}
          rail={rail}
        />
      ) : null}
      {openId ? (
        // The dock carries position only, leaving the frame's own transform
        // free for its entry animation.
        <div
          className="site-nav-dock"
          data-morph={morph ? "" : undefined}
          style={{ transform: `translateX(${box?.x ?? 0}px)` }}
        >
          <div
            id={panelId}
            role="group"
            aria-label={
              openId === "account" ? "Account" : menus.get(openId)?.label
            }
            className="site-nav-panel"
            data-morph={morph ? "" : undefined}
            data-measured={box ? "" : undefined}
            data-motion={motion === "keyboard" ? "none" : undefined}
            style={box ? { width: box.w, height: box.h } : undefined}
          >
            {exitingId ? (
              <div
                key={exitingId}
                className="site-nav-panel-body"
                data-exiting=""
                aria-hidden
                inert
              >
                <RailPanelBody
                  id={exitingId}
                  menus={menus}
                  pathname={pathname}
                  accountUser={accountUser}
                  onNavigate={() => close()}
                />
              </div>
            ) : null}
            <div key={openId} ref={bodyRef} className="site-nav-panel-body">
              <RailPanelBody
                id={openId}
                menus={menus}
                pathname={pathname}
                accountUser={accountUser}
                onNavigate={() => close()}
              />
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

function MobileAccordionItems({
  items,
  pathname,
  onNavigate,
}: {
  items: readonly NavLink[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="pb-3">
      <ul className="flex flex-col border-l border-[var(--color-line)] pl-3">
        {items.map((item) => {
          const current = navLinkIsCurrent(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                to={item.href}
                aria-current={current ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-11 items-center text-[15px]",
                  current
                    ? "font-medium text-[#014e59]"
                    : "text-[var(--color-ink-muted)]",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  // Every link in the sheet closes it on activation, so the sheet plays its
  // exit animation instead of being torn down by a route-keyed remount.
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          // 40px to match the adjacent CTA's `min-h-10`, and round so the pair
          // shares one radius language instead of squircle-against-pill.
          className="site-nav-sheet-button ml-auto inline-flex size-10 items-center justify-center rounded-full lg:hidden"
        >
          <Menu aria-hidden className="size-[18px]" strokeWidth={2.25} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="site-nav-sheet-overlay fixed inset-0 z-[70]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="site-nav-sheet-panel fixed inset-0 z-[70] flex flex-col bg-white"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="flex h-12 items-center justify-between px-3 sm:h-14 sm:px-6">
            <Dialog.Close asChild>
              <Link
                to="/"
                aria-label="Construct Computer - home"
                className="font-display text-[16px] italic leading-6 tracking-[-.015em]"
              >
                <span className="text-[#4e4646]">Construct</span>
                <span className="text-[#01b4c8]">Computer</span>
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              {/* Identical to the opener, so the control the user tapped is
                  the control they tap again to leave. */}
              <button
                type="button"
                aria-label="Close menu"
                className="site-nav-sheet-button inline-flex size-10 items-center justify-center rounded-full"
              >
                <X aria-hidden className="size-[18px]" strokeWidth={2.25} />
              </button>
            </Dialog.Close>
          </div>
          <div
            data-lenis-prevent
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
          >
            <Accordion.Root type="multiple" className="flex flex-col">
              {primaryNav.map((item) =>
                item.kind === "link" ? (
                  <Link
                    key={item.href}
                    to={item.href}
                    aria-current={
                      navLinkIsCurrent(pathname, item.href) ? "page" : undefined
                    }
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-14 items-center border-b border-[var(--color-line-soft)] text-[17px] font-medium last:border-b-0",
                      navItemIsCurrent(pathname, item)
                        ? "text-[#014e59]"
                        : "text-[#4e4646]",
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <Accordion.Item
                    key={item.id}
                    value={item.id}
                    className="border-b border-[var(--color-line-soft)] last:border-b-0"
                  >
                    <Accordion.Header>
                      <Accordion.Trigger
                        className={cn(
                          "group flex min-h-14 w-full items-center justify-between text-[17px] font-medium",
                          navItemIsCurrent(pathname, item)
                            ? "text-[#014e59]"
                            : "text-[#4e4646]",
                        )}
                      >
                        {item.label}
                        <ChevronDown
                          aria-hidden
                          className="size-4 opacity-70 transition-transform duration-[var(--dur-hover)] ease-[var(--ease-snap)] group-data-[state=open]:rotate-180"
                        />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="site-nav-accordion">
                      <MobileAccordionItems
                        items={item.items}
                        pathname={pathname}
                        onNavigate={() => setOpen(false)}
                      />
                    </Accordion.Content>
                  </Accordion.Item>
                ),
              )}
            </Accordion.Root>
          </div>
          {/* flex, so the inline-level pill stretches without leaving a
              baseline gap under it. */}
          <div className="flex border-t border-[#eff3f5] p-4">
            <StartCta
              source="nav-mobile"
              onClick={() => setOpen(false)}
              className="min-h-12 w-full text-sm"
            >
              Start Now
            </StartCta>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function SiteNav({
  accountUser,
}: {
  accountUser?: AuthUser | null;
} = {}) {
  const { pathname } = useLocation();
  return (
    <>
      <DesktopNav pathname={pathname} accountUser={accountUser} />
      <MobileNav pathname={pathname} />
    </>
  );
}

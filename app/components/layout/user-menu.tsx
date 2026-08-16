import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router";

import { useAuth } from "../../features/auth/auth-provider";
import { cn } from "../../lib/cn";
import type { AuthUser } from "../../platform/api/schemas";
import { getOsOrigin } from "../../platform/env";
import "./site-nav.css";

/** Keep in step with the desktop nav rail in `site-nav.tsx`. */
const OPEN_MS = 100;
const CLOSE_MS = 180;

type Motion = "pointer" | "keyboard";

function canHover(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function accountDisplayName(user: AuthUser): string {
  return user.displayName?.trim() || user.username;
}

export function AccountMenuAvatar({
  user,
  name,
}: {
  user: AuthUser;
  name: string;
}) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        width={22}
        height={22}
        // Google avatar URLs 403 when a referrer is attached.
        referrerPolicy="no-referrer"
        className="size-[22px] shrink-0 rounded-full object-cover"
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#effbfc] text-[10px] font-bold text-[#018fa0]"
    >
      {initial}
    </span>
  );
}

export const accountTriggerClassName =
  "site-cta inline-flex min-h-10 max-w-[11.5rem] shrink-0 items-center gap-1.5 rounded-full bg-black px-2 py-1 text-[11px] font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,.16)] sm:max-w-[14rem] sm:gap-2 sm:px-2.5 sm:text-xs lg:px-3";

const itemClassName =
  "site-nav-item flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium";

/** Shared by the nav rail panel and the standalone (mobile / launch) menu. */
export function AccountPanelBody({
  user,
  onNavigate,
}: {
  user: AuthUser;
  onNavigate: () => void;
}) {
  const { logout } = useAuth();
  const name = accountDisplayName(user);

  return (
    <div className="w-[13.5rem] p-2">
      <div className="px-2.5 py-2">
        <p className="truncate text-[13px] font-semibold text-[#4e4646]">
          {name}
        </p>
        {user.email ? (
          <p className="mt-0.5 truncate text-[11px] text-[#627c86]">
            {user.email}
          </p>
        ) : null}
      </div>

      <div className="my-1 h-px bg-[#eff3f5]" />

      <Link to="/account" className={itemClassName} onClick={onNavigate}>
        <span className="min-w-0 truncate">Account</span>
        <span aria-hidden className="site-nav-item-arrow">
          →
        </span>
      </Link>
      <a href={getOsOrigin()} className={itemClassName} onClick={onNavigate}>
        <span className="min-w-0 truncate">Open OS</span>
        <span aria-hidden className="site-nav-item-arrow">
          →
        </span>
      </a>

      <div className="my-1 h-px bg-[#eff3f5]" />

      <button
        type="button"
        className="flex min-h-9 w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-[#9b3b3b] transition-colors hover:bg-[#fef2f2] focus-visible:bg-[#fef2f2]"
        onClick={() => {
          onNavigate();
          void logout();
        }}
      >
        Log out
      </button>
    </div>
  );
}

export function UserMenu({
  user,
  className,
}: {
  user: AuthUser;
  className?: string;
}) {
  const name = accountDisplayName(user);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef(0);
  const closeTimer = useRef(0);
  const [open, setOpen] = useState(false);
  const [motion, setMotion] = useState<Motion>("pointer");

  const close = useCallback(() => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    setOpen(false);
  }, []);

  const openMenu = useCallback((how: Motion) => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    setMotion(how);
    setOpen(true);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: Event) => {
      if ((event as globalThis.KeyboardEvent).key === "Escape") close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  const onPointerEnter = () => {
    if (!canHover()) return;
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      if (!rootRef.current?.matches(":hover")) return;
      openMenu("pointer");
    }, OPEN_MS);
  };

  const onPointerLeave = () => {
    window.clearTimeout(openTimer.current);
    if (!canHover()) return;
    closeTimer.current = window.setTimeout(() => close(), CLOSE_MS);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) close();
      else openMenu("keyboard");
    }
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      openMenu("keyboard");
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex shrink-0 self-stretch items-center",
        className,
      )}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        type="button"
        aria-label={`Account menu for ${name}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? panelId : undefined}
        data-open={open ? "" : undefined}
        className={accountTriggerClassName}
        onClick={() => {
          if (open) {
            if (!canHover()) close();
            return;
          }
          openMenu(canHover() ? "pointer" : "keyboard");
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <AccountMenuAvatar user={user} name={name} />
        <span className="min-w-0 truncate">{name}</span>
        <ChevronDown
          aria-hidden
          data-open={open ? "true" : undefined}
          className="site-nav-chevron size-3.5 shrink-0 opacity-70"
          strokeWidth={2.5}
        />
      </button>

      {open ? (
        <div className="site-nav-dock" data-align="end">
          <div
            id={panelId}
            role="group"
            aria-label="Account"
            className="site-nav-panel"
            data-measured=""
            data-motion={motion === "keyboard" ? "none" : undefined}
          >
            <AccountPanelBody user={user} onNavigate={close} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router";

import { useAuth } from "../../features/auth/auth-provider";
import type { AuthUser } from "../../platform/api/schemas";
import { getOsOrigin } from "../../platform/env";

function MenuAvatar({ user, name }: { user: AuthUser; name: string }) {
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

const itemClassName =
  "flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#4e4646] outline-none data-[highlighted]:bg-[#effbfc] data-[highlighted]:text-[#014e59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#01b4c8]";

export function UserMenu({ user }: { user: AuthUser }) {
  const { logout } = useAuth();
  const name = user.displayName?.trim() || user.username;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${name}`}
          className="site-cta inline-flex min-h-10 max-w-[11.5rem] shrink-0 items-center gap-1.5 rounded-full bg-black px-2 py-1 text-[11px] font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#01b4c8] sm:max-w-[14rem] sm:gap-2 sm:px-2.5 sm:text-xs lg:px-3"
        >
          <MenuAvatar user={user} name={name} />
          <span className="min-w-0 truncate">{name}</span>
          <ChevronDown
            aria-hidden
            className="size-3.5 shrink-0 opacity-70"
            strokeWidth={2.5}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-[60] min-w-[13.5rem] overflow-hidden rounded-xl border border-[#dcecef] bg-white p-1.5 shadow-[0_16px_40px_rgba(37,72,82,.14)] data-[state=open]:animate-[fade-in_140ms_var(--ease-snap)]"
        >
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

          <DropdownMenu.Separator className="my-1 h-px bg-[#eff3f5]" />

          <DropdownMenu.Item asChild>
            <Link to="/account" className={itemClassName}>
              Account
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a href={getOsOrigin()} className={itemClassName}>
              Open OS
            </a>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-[#eff3f5]" />

          <DropdownMenu.Item
            className={`${itemClassName} text-[#9b3b3b] data-[highlighted]:bg-[#fef2f2] data-[highlighted]:text-[#9b3b3b]`}
            onSelect={() => {
              void logout();
            }}
          >
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef } from "react";

import { cn } from "../../lib/cn";
import { slideImage, slides } from "./slides";

/**
 * Every slide at a glance, opened from the slide count in the bar: a
 * full-screen grid of thumbnails, the current one marked. On a phone it's the
 * only overview, since the desktop's slide rail has no room. Picking one
 * closes the grid and scrolls there once the page can scroll again.
 */
export function DeckOverview({
  open,
  onOpenChange,
  active,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: number;
  onPick: (index: number) => void;
}) {
  const picked = useRef<number | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const index = picked.current;
            picked.current = null;
            // The scroll lock lifts as the dialog unmounts; scroll after it.
            if (index !== null) requestAnimationFrame(() => onPick(index));
          }}
          className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-[#0b0b0c] px-4 pb-10 text-white focus:outline-none"
        >
          <div className="sticky top-0 z-10 -mx-4 mb-2 flex items-center justify-between bg-[#0b0b0c] px-4 py-3">
            <Dialog.Title className="text-lg font-semibold">Slides</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="-mr-2 cursor-pointer rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <ol className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
            {slides.map((slide, index) => (
              <li key={slide.title}>
                <button
                  type="button"
                  aria-label={`${index + 1}. ${slide.title}`}
                  aria-current={index === active ? "true" : undefined}
                  onClick={() => {
                    picked.current = index;
                    onOpenChange(false);
                  }}
                  className="block w-full cursor-pointer text-left"
                >
                  <img
                    src={slideImage(index, "thumb")}
                    alt=""
                    width={480}
                    height={270}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className={cn(
                      "block aspect-video w-full rounded-md ring-2 ring-offset-2 ring-offset-[#0b0b0c]",
                      index === active ? "ring-[#01b4c8]" : "ring-transparent",
                    )}
                  />
                  <span className="mt-2 flex gap-1.5 text-[13px] leading-5">
                    <span className="text-white/45 tabular-nums">{index + 1}</span>
                    <span className="truncate">{slide.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

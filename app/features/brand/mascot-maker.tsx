import { Fragment, useRef, useState } from "react";

import {
  MASCOT_PREVIEW_PX,
  mascotCombo,
  mascotCombos,
  mascotHref,
  mascotPreview,
  mascotRoles,
  mascotTints,
  type MascotTint,
} from "../../content/brand";
import { CheckIcon, SwapLabel, useConfirm } from "../tools/tool-motion";
import { plateClass, primaryButton, saveFile, trackBrand } from "./brand-ui";

const chip =
  "tool-press inline-flex min-h-9 cursor-pointer items-center rounded-full border border-[#d7dee2] bg-white px-3 text-[13px] text-[#4e4646] hover:border-[#01b4c8] has-checked:border-[#01b4c8] has-checked:bg-[#effbfc] has-checked:text-[#017b89] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#01b4c8]";
const legend = "mb-2 text-[13px] font-medium text-[#4e4646]";

/**
 * Pick a role, a color and the eyes, and get the finished mascot: every
 * combination is assembled ahead of time on the CDN, so the preview is one
 * image and the download is one file. Nothing is drawn in the browser.
 */
export function MascotMaker() {
  const [roleId, setRoleId] = useState("support");
  const [tint, setTint] = useState<MascotTint>("construct");
  const [happy, setHappy] = useState(false);
  const [saved, confirm] = useConfirm();
  const warmed = useRef(new Set<MascotTint>());

  const combo = mascotCombo(roleId, tint, happy);

  // Every mascot in one color is about 500KB of previews in all; fetch the
  // set once someone shows interest, so switching roles never shows a gap.
  const warm = (color: MascotTint) => {
    if (warmed.current.has(color)) return;
    warmed.current.add(color);
    for (const entry of mascotCombos) {
      if (entry.tint === color) new Image().src = mascotPreview(entry);
    }
  };

  const save = async () => {
    await saveFile(mascotHref(combo));
    confirm();
    trackBrand(`mascot-${combo.role.id}`, "download");
  };

  return (
    <div
      onPointerEnter={() => warm(tint)}
      onFocus={() => warm(tint)}
      className="grid gap-5 rounded-xl border border-[#e5e7eb] bg-[#f7fbfc] p-4 sm:p-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-8"
    >
      <div
        className={`relative aspect-square overflow-hidden rounded-lg ${plateClass.sky}`}
        role="img"
        aria-label={`The Construct mascot, ${combo.role.label.toLowerCase()}, ${tint} color${happy ? ", smiling" : ""}`}
      >
        <img
          src={mascotPreview(combo)}
          alt=""
          width={MASCOT_PREVIEW_PX}
          height={MASCOT_PREVIEW_PX}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full"
        />
      </div>

      <div className="flex flex-col gap-6">
        <fieldset>
          <legend className={legend}>Role</legend>
          <div className="flex flex-wrap gap-1.5">
            {mascotRoles.map((entry) => (
              <Fragment key={entry.id}>
                <label className={chip}>
                  <input
                    type="radio"
                    name="mascot-role"
                    value={entry.id}
                    checked={entry.id === roleId}
                    onChange={() => setRoleId(entry.id)}
                    className="sr-only"
                  />
                  {entry.label}
                </label>{" "}
              </Fragment>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>Color</legend>
          <div className="flex flex-wrap gap-2">
            {mascotTints.map((entry) => (
              <Fragment key={entry.id}>
                <label className="tool-press grid h-9 w-9 cursor-pointer place-items-center rounded-full border-2 border-transparent has-checked:border-[#01b4c8] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#01b4c8]">
                  <input
                    type="radio"
                    name="mascot-tint"
                    value={entry.id}
                    checked={entry.id === tint}
                    onChange={() => {
                      setTint(entry.id);
                      warm(entry.id);
                    }}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className="h-6 w-6 rounded-full ring-1 ring-black/10"
                    style={{ background: entry.swatch }}
                  />
                  <span className="sr-only">{entry.id}</span>
                </label>{" "}
              </Fragment>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>Eyes</legend>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                [false, "Open"],
                [true, "Happy"],
              ] as const
            ).map(([value, label]) => (
              <Fragment key={label}>
                <label className={chip}>
                  <input
                    type="radio"
                    name="mascot-eyes"
                    checked={happy === value}
                    onChange={() => setHappy(value)}
                    className="sr-only"
                  />
                  {label}
                </label>{" "}
              </Fragment>
            ))}
          </div>
        </fieldset>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* A real link to the PNG, so an agent reading the page gets the
              file; a click saves it under its own name instead. */}
          <a
            href={mascotHref(combo)}
            target="_blank"
            rel="noopener"
            onClick={(event) => {
              event.preventDefault();
              void save();
            }}
            className={`${primaryButton} min-h-10 px-4 text-[14px]`}
          >
            <SwapLabel
              done={saved}
              idle={
                <>
                  Download PNG{" "}
                  <span className="font-normal text-white/80">1024</span>
                </>
              }
              confirmed={
                <>
                  <CheckIcon />
                  Saved
                </>
              }
            />
          </a>
          <span aria-live="polite" className="sr-only">
            {saved ? `Saved ${combo.stem}.png` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

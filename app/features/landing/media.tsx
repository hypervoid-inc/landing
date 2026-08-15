import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

/**
 * Reveals `.reveal-item` descendants once when they enter the viewport.
 * Hero items with `data-reveal="mount"` fire on the frame after hide is applied.
 * Under reduced motion, marks everything visible with no animation.
 */
export function useRevealOnView(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = [...root.querySelectorAll<HTMLElement>(".reveal-item")];
    if (!items.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      items.forEach((el) => el.setAttribute("data-reveal-visible", ""));
      return;
    }

    // Hide before paint, then start mount animations on the next frame so the
    // opacity:0 rule is committed before data-reveal-visible is added.
    root.setAttribute("data-reveal-enabled", "");

    const mountItems = items.filter((el) => el.dataset.reveal === "mount");
    const scrollItems = items.filter((el) => el.dataset.reveal !== "mount");

    let mountFrame = 0;
    let startFrame = 0;
    startFrame = requestAnimationFrame(() => {
      mountFrame = requestAnimationFrame(() => {
        mountItems.forEach((el) => el.setAttribute("data-reveal-visible", ""));
      });
    });

    if (!scrollItems.length) {
      return () => {
        cancelAnimationFrame(startFrame);
        cancelAnimationFrame(mountFrame);
        root.removeAttribute("data-reveal-enabled");
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.setAttribute("data-reveal-visible", "");
          observer.unobserve(el);
        }
      },
      { rootMargin: "-10% 0px" },
    );
    scrollItems.forEach((el) => observer.observe(el));

    return () => {
      cancelAnimationFrame(startFrame);
      cancelAnimationFrame(mountFrame);
      observer.disconnect();
      root.removeAttribute("data-reveal-enabled");
    };
  }, [rootRef]);
}

export function useDesktop() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return desktop;
}

export function AutoVideo({
  src,
  webm,
  poster,
  label,
  className,
  decorative = false,
  width,
  height,
  preload = "metadata",
  ...rest
}: {
  src: string;
  webm?: string;
  poster: string;
  label?: string;
  className?: string;
  decorative?: boolean;
  width?: number;
  height?: number;
  preload?: "none" | "metadata" | "auto";
  "data-reveal-delay"?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !reducedMotion) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload={preload}
      poster={poster}
      width={width}
      height={height}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={className ?? "h-full w-full object-cover"}
      {...rest}
    >
      {webm ? <source src={webm} type="video/webm" /> : null}
      <source src={src} type="video/mp4" />
    </video>
  );
}

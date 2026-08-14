import { useEffect, useRef } from "react";
import { Link } from "react-router";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { StartLink } from "../landing/beta-access";
import { getRoute } from "../../lib/route-manifest";
import {
  getUseCase,
  relatedUseCasePosts,
  useCases,
  type UseCase,
} from "../../content/use-cases";
import { NotFoundPage } from "./resource-pages";

const homeCrumb = { label: "Home", to: "/" };
const useCasesCrumb = { label: "Use Cases", to: "/use-cases/" };

function Breadcrumbs({ current }: { current: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-[13px] leading-5 text-[#8a9aa2]"
    >
      <ol className="flex flex-wrap items-center gap-2">
        <li className="flex items-center gap-2">
          <Link
            to={homeCrumb.to}
            className="transition-colors hover:text-[#01b4c8]"
          >
            {homeCrumb.label}
          </Link>
          <span aria-hidden>/</span>
        </li>
        {current === "Use Cases" ? (
          <li aria-current="page">Use Cases</li>
        ) : (
          <>
            <li className="flex items-center gap-2">
              <Link
                to={useCasesCrumb.to}
                className="transition-colors hover:text-[#01b4c8]"
              >
                {useCasesCrumb.label}
              </Link>
              <span aria-hidden>/</span>
            </li>
            <li aria-current="page">{current}</li>
          </>
        )}
      </ol>
    </nav>
  );
}

function RelatedCard({ slug }: { slug: string }) {
  const route = getRoute(`/blog/${slug}`);
  if (!route) return null;
  const image = new URL(route.image).pathname;
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white transition-colors hover:border-[#8adcdf]">
      <Link
        to={`${route.path}/`}
        className="absolute inset-0 z-[1]"
        aria-label={route.displayTitle ?? route.title}
      />
      <img
        src={image}
        alt=""
        width="1200"
        height="630"
        loading="lazy"
        className="aspect-[1200/630] w-full object-cover"
      />
      <div className="p-5">
        <h3 className="font-geist text-[22px] italic leading-tight tracking-[-0.015em] text-[#4e4646] transition-colors group-hover:text-[#01b4c8]">
          {route.displayTitle ?? route.title}
        </h3>
        <p className="mt-2 text-[14px] leading-5 text-[#627c86]">
          {route.description}
        </p>
      </div>
    </article>
  );
}

function BlockList({
  heading,
  items,
}: {
  heading: string;
  items: UseCase["problems"];
}) {
  const headingId = heading.toLowerCase().replaceAll(" ", "-");
  return (
    <section aria-labelledby={headingId} className="mt-16 sm:mt-20">
      <h2
        id={headingId}
        className="font-geist text-[28px] italic tracking-[-0.02em] text-[#4e4646] sm:text-[32px]"
      >
        {heading}
      </h2>
      <ul className="mt-8 grid list-none gap-6 p-0 sm:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.title}
            className="rounded-2xl border border-[#e5e7eb] bg-[#f7fbfc] p-5"
          >
            <h3 className="text-[16px] font-semibold leading-6 text-[#4e4646]">
              {item.title}
            </h3>
            <p className="mt-2 text-[14px] leading-6 text-[#627c86]">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Ambient demo, same grammar as the landing page's workflow screens: it starts
 * itself, loops, and carries no controls.
 *
 * Two things the earlier markup got wrong. The recordings are 3:2 (1440x960) or
 * 1252x900, so forcing them into `aspect-video` with `object-cover` sheared 16%
 * to 22% off the height — enough to cut the app's own header off the top. And
 * the frame's 22px radius bit into UI that runs edge to edge in the capture, so
 * the video now sits on a thin canvas matte and the rounding happens outside
 * the picture. The matte also takes the letterbox bars on the 1252x900 clips,
 * which is why it is canvas rather than black. Radii stay concentric: 16px
 * outer minus the 6px matte leaves 10px inner.
 */
function UseCaseVideo({ entry }: { entry: UseCase }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // Playback is driven here rather than by the `autoplay` attribute so a
    // reader who asked for reduced motion keeps the poster frame instead.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([visible]) => {
        if (visible?.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { rootMargin: "120px" },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, []);

  return (
    <figure className="mt-12 overflow-hidden rounded-2xl border border-[#dcecef] bg-[var(--color-canvas)] p-1.5">
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="metadata"
        poster={entry.poster}
        aria-label={entry.videoLabel}
        className="block aspect-[3/2] w-full rounded-[10px] object-contain"
      >
        <source src={entry.video} type="video/mp4" />
      </video>
    </figure>
  );
}

function UseCaseBody({ entry }: { entry: UseCase }) {
  const related = relatedUseCasePosts(entry);
  return (
    <>
      <header className="mt-8 max-w-3xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#01b4c8]">
          {entry.navLabel}
        </p>
        <h1 className="font-geist mt-3 text-[36px] italic leading-[1.1] tracking-[-0.02em] text-[#4e4646] sm:text-[44px] lg:text-[52px]">
          {entry.title}
        </h1>
        <p className="mt-5 text-[17px] leading-7 text-[#627c86] sm:text-[18px]">
          {entry.lede}
        </p>
        <StartLink
          source={`use-case-${entry.slug}`}
          className="site-cta mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white"
        >
          {entry.ctaLabel}
        </StartLink>
      </header>

      <UseCaseVideo entry={entry} />

      <BlockList
        heading="The cost of leaving it unencoded"
        items={entry.problems}
      />
      <BlockList
        heading="What Construct actually does"
        items={entry.features}
      />

      <section aria-labelledby="recommended-reading" className="mt-16 sm:mt-20">
        <h2
          id="recommended-reading"
          className="font-geist text-[28px] italic tracking-[-0.02em] text-[#4e4646] sm:text-[32px]"
        >
          Recommended reading
        </h2>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#627c86]">
          Two pieces from the library that go deeper on this job.
        </p>
        <ul className="mt-8 grid list-none gap-6 p-0 sm:grid-cols-2">
          {related.map((post) => (
            <li key={post.slug}>
              <RelatedCard slug={post.slug} />
            </li>
          ))}
        </ul>
      </section>

      <BlockList heading="Why this is the product" items={entry.why} />

      <section className="mt-16 rounded-[22px] bg-[#effbfc] px-6 py-10 text-center sm:mt-20 sm:px-10">
        <h2 className="font-geist text-[28px] italic text-[#4e4646] sm:text-[32px]">
          {entry.ctaLabel}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-6 text-[#627c86]">
          Start in the cloud desktop. The same agent, files, and memory sit
          behind every use case on this site.
        </p>
        <StartLink
          source={`use-case-${entry.slug}-footer`}
          className="site-cta mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white"
        >
          Start Now
        </StartLink>
      </section>
    </>
  );
}

export function UseCaseIndexPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#4e4646]">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 pt-10 sm:px-6 lg:pt-16"
      >
        <Breadcrumbs current="Use Cases" />
        <h1 className="font-geist mt-8 text-[36px] italic leading-[1.1] tracking-[-0.02em] sm:text-[44px] lg:text-[52px]">
          Use Cases
        </h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-7 text-[#627c86]">
          Construct is an AI employee with its own computer. These are the jobs
          teams actually hand it — not industry verticals, the work.
        </p>
        <ul className="mt-12 grid list-none gap-6 p-0 sm:grid-cols-2">
          {useCases.map((entry) => (
            <li key={entry.slug}>
              <article className="group relative h-full overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white transition-colors hover:border-[#8adcdf]">
                <Link
                  to={`/use-cases/${entry.slug}/`}
                  className="absolute inset-0 z-[1]"
                  aria-label={entry.navLabel}
                />
                <img
                  src={entry.poster}
                  alt=""
                  width="960"
                  height="540"
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                />
                <div className="p-5">
                  <h2 className="font-geist text-[24px] italic leading-tight text-[#4e4646] transition-colors group-hover:text-[#01b4c8]">
                    {entry.navLabel}
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-[#627c86]">
                    {entry.description}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}

export function UseCasePage({ slug }: { slug: string }) {
  const entry = getUseCase(slug);
  if (!entry) return <NotFoundPage />;

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#4e4646]">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 pt-10 sm:px-6 lg:pt-16"
      >
        <Breadcrumbs current={entry.navLabel} />
        <UseCaseBody entry={entry} />
      </main>
      <SiteFooter />
    </div>
  );
}

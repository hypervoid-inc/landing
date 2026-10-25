import type { ReactNode } from "react";
import { Link } from "react-router";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import {
  AFFILIATE_LINK,
  BRAND_UPDATED,
  badgeSnippet,
  brandCaptions,
  brandColors,
  brandDescriptions,
  brandDisclosure,
  brandEmail,
  brandEmailTemplate,
  brandFacts,
  brandFaq,
  brandFeatures,
  brandGroup,
  brandDocument,
  brandKit,
  brandName,
  brandTaglines,
  brandTerms,
  brandTypefaces,
  brandUsage,
  brandVideos,
  type BrandAsset,
  type BrandColor,
  type BrandCopy,
  YOUTUBE_CHANNEL,
  youtubeEmbed,
  youtubeUrl,
} from "../../content/brand";
import { siteUrl } from "../../lib/route-manifest";
import { Breadcrumbs } from "../tools/tool-breadcrumbs";
import { useConfirm } from "../tools/tool-motion";
import "../tools/tools.css";
import {
  AssetCard,
  copy,
  CopyButton,
  FileLinks,
  inlineLink,
  Logomark,
  plateClass,
  primaryButton,
  Rule,
  textAction,
  trackBrand,
  type Pad,
  type Ratio,
} from "./brand-ui";
import { MascotMaker } from "./mascot-maker";

/**
 * `/brand/`: every file a partner, directory or writer needs, the words to
 * describe Construct, and the rules for using them, files first. All of it
 * comes from `app/content/brand.ts`, which also feeds `/brand/brand.json`
 * and the zips.
 */

const sections = [
  ["logo", "Logo"],
  ["screenshots", "Screenshots"],
  ["banner", "Banner"],
  ["color", "Color and type"],
  ["video", "Video"],
  ["partners", "Partners"],
  ["banners", "Ad banners"],
  ["mascot", "Mascot"],
  ["copy", "Copy"],
  ["usage", "Usage"],
] as const;

type SectionId = (typeof sections)[number][0];

const h2 =
  "font-geist text-[26px] italic leading-tight tracking-[-0.015em] text-[#4e4646] sm:text-[30px]";
const h3 = "text-[15px] font-medium text-[#4e4646]";
const prose = "max-w-2xl text-[15px] leading-7 text-[#627c86]";
const muted = "text-[13px] leading-5 text-[#8a9aa2]";
const card = "rounded-xl border border-[#e5e7eb]";

function Section({
  id,
  aside,
  children,
}: {
  id: SectionId;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const title = sections.find(([key]) => key === id)![1];
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-24 border-t border-[#eef3f5] pt-10 sm:pt-12"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id={`${id}-heading`} className={h2}>
          {title}
        </h2>
        {aside}
      </div>
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

function Sub({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className={h3}>{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Grid({
  columns,
  className = "",
  children,
}: {
  columns: "2" | "3" | "4" | "6";
  className?: string;
  children: ReactNode;
}) {
  const cols = {
    "2": "sm:grid-cols-2",
    "3": "sm:grid-cols-2 lg:grid-cols-3",
    "4": "grid-cols-2 lg:grid-cols-4",
    "6": "grid-cols-3 lg:grid-cols-6",
  }[columns];
  return (
    <div className={`grid gap-5 sm:gap-6 ${cols} ${className}`}>{children}</div>
  );
}

function Assets({
  group,
  columns,
  ratio,
  pad,
  fit,
}: {
  group: string;
  columns: "2" | "3" | "4";
  ratio?: Ratio;
  pad?: Pad;
  fit?: "contain" | "cover";
}) {
  const { title, assets } = brandGroup(group);
  return (
    <Grid columns={columns} className="items-start">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          group={title}
          ratio={ratio}
          pad={pad}
          fit={fit}
        />
      ))}
    </Grid>
  );
}

/** Small files side by side at their own size, wrapping as they need. */
function AssetRow({ group }: { group: string }) {
  const { title, assets } = brandGroup(group);
  return (
    <div className="flex flex-wrap items-start gap-5 sm:gap-6">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          group={title}
          ratio="natural"
          pad="none"
          fit="cover"
          trueSize
        />
      ))}
    </div>
  );
}

function updatedOn(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/* ------------------------------------------------------------------ Logo */

const ruleMark = "w-[34%]";

function LogoSection() {
  return (
    <Section id="logo">
      <p className={prose}>
        The wordmark is the logo. Use the lockup where a listing wants the logo
        with its icon, the logomark where space is tight, and the squares where
        a form asks for a square image.
      </p>
      {(["wordmark", "logomark", "lockup", "stacked"] as const).map((id) => (
        <Sub key={id} title={brandGroup(id).title}>
          <Assets
            group={id}
            columns="3"
            ratio={id === "wordmark" || id === "lockup" ? "5/2" : "3/2"}
            pad={id === "logomark" ? "roomy" : "tight"}
          />
        </Sub>
      ))}
      <Sub title="Icon and avatar">
        <Assets group="icon" columns="4" ratio="1/1" pad="none" fit="cover" />
      </Sub>
      <Sub title="Keep it as it is">
        <p className={`${prose} mb-4`}>
          Leave at least one eye’s width clear around every mark. Keep the
          logomark at 16px or larger and the wordmark at least 96px wide.
        </p>
        <Grid columns="4">
          <Rule ok={false} caption="Stretch or squash it">
            <Logomark
              fill="#18325C"
              className={ruleMark}
              style={{ transform: "scaleX(1.5)" }}
            />
          </Rule>
          <Rule ok={false} caption="Recolor it">
            <Logomark fill="#F97316" className={ruleMark} />
          </Rule>
          <Rule ok={false} caption="Add shadows or outlines">
            <Logomark
              fill="#18325C"
              className={ruleMark}
              style={{
                filter:
                  "drop-shadow(0 0 0 #01b4c8) drop-shadow(6px 8px 0 #01b4c8)",
              }}
            />
          </Rule>
          <Rule ok={false} caption="Retype the wordmark">
            <span className="text-[15px] font-black tracking-tight text-[#4e4646] lg:text-[18px]">
              Construct Computer
            </span>
          </Rule>
        </Grid>
      </Sub>
    </Section>
  );
}

/* ---------------------------------------------------------------- Mascot */

function MascotSection() {
  const { title, assets } = brandGroup("mascot");
  return (
    <Section id="mascot">
      <MascotMaker />
      <ul className="flex flex-wrap gap-x-8 gap-y-2">
        {assets.map((asset) => (
          <li
            key={asset.id}
            className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1"
          >
            <span className="text-[14px] font-medium text-[#4e4646]">
              {asset.name}
            </span>
            <FileLinks asset={asset} group={title} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ----------------------------------------------------------- Screenshots */

function ScreenshotsSection() {
  const { title, assets } = brandGroup("launch");
  return (
    <Section id="screenshots">
      <Sub title={title}>
        {/* Two large, then three: five slides with no empty cell. */}
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-6">
          {assets.map((asset, index) => (
            <div
              key={asset.id}
              className={index < 2 ? "lg:col-span-3" : "lg:col-span-2"}
            >
              <AssetCard
                asset={asset}
                group={title}
                ratio="5/3"
                pad="none"
                fit="cover"
              />
            </div>
          ))}
        </div>
      </Sub>
    </Section>
  );
}

/* ---------------------------------------------------------------- Banner */

function BannerSection() {
  const { title, assets } = brandGroup("banner");
  return (
    <Section id="banner">
      <div className="max-w-3xl">
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            group={title}
            ratio="16/9"
            pad="none"
            fit="cover"
          />
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- Video */

function VideoSection() {
  return (
    <Section
      id="video"
      aside={
        <a
          href={YOUTUBE_CHANNEL}
          target="_blank"
          rel="noopener"
          className={textAction}
        >
          YouTube channel
        </a>
      }
    >
      <Grid columns="3" className="items-start">
        {brandVideos.map((video) => (
          <figure key={video.id}>
            <a
              href={youtubeUrl(video)}
              target="_blank"
              rel="noopener"
              aria-label={`${video.title}, on YouTube`}
              className="group relative block aspect-video overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#081225] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01b4c8]"
            >
              <img
                src={video.preview}
                alt=""
                width="720"
                height="405"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
              />
            </a>
            <figcaption className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-0.5">
              <span className="text-[14px] font-medium text-[#4e4646]">
                {video.title}
              </span>
              <span className="flex flex-wrap items-center gap-x-3.5">
                <a
                  href={youtubeUrl(video)}
                  target="_blank"
                  rel="noopener"
                  className={textAction}
                >
                  Watch
                </a>
                <CopyButton
                  text={youtubeEmbed(video)}
                  asset={video.id}
                  label={`Copy the embed code for ${video.title}`}
                >
                  Copy embed
                </CopyButton>
              </span>
            </figcaption>
          </figure>
        ))}
      </Grid>
    </Section>
  );
}

/* ------------------------------------------------------------------ Copy */

const count = (entry: BrandCopy) =>
  entry.max
    ? `${entry.text.length} of ${entry.max} characters`
    : `${entry.text.trim().split(/\s+/).length} words`;

/** A piece of copy with its own copy button. Blank lines split paragraphs. */
function CopyBlock({
  entry,
  heading,
  copyText = entry.text,
}: {
  entry: BrandCopy;
  heading?: ReactNode;
  copyText?: string;
}) {
  return (
    <article className={`${card} p-5`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[14px] font-medium text-[#4e4646]">
          {entry.label}
          <span className={`${muted} ml-3 font-normal`}>{count(entry)}</span>
        </span>
        <CopyButton
          text={copyText}
          asset={`copy-${entry.id}`}
          label={`Copy ${entry.label.toLowerCase()}`}
        >
          Copy
        </CopyButton>
        <span className={`${muted} basis-full`}>{entry.fits}</span>
      </div>
      {heading}
      <div className="space-y-3 text-[15px] leading-7 text-[#4e4646]">
        {entry.text.split("\n\n").map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}

function FactValue({ fact }: { fact: (typeof brandFacts)[number] }) {
  if (!fact.href) return <>{fact.value}</>;
  const className = "hover:text-[#017b89] hover:underline";
  return fact.href.startsWith("/") ? (
    <Link to={fact.href} className={className}>
      {fact.value}
    </Link>
  ) : (
    <a
      href={fact.href}
      className={className}
      target={fact.href.startsWith("mailto:") ? undefined : "_blank"}
      rel={fact.href.startsWith("mailto:") ? undefined : "noopener"}
    >
      {fact.value}
    </a>
  );
}

function CopySection() {
  const faqText = brandFaq
    .map((entry) => `${entry.question}\n\n${entry.answer}`)
    .join("\n\n");
  return (
    <Section id="copy">
      <p className={prose}>
        {brandName.rule} Every description below opens with the full name, so a
        listing never gets mixed up with the other Constructs in search.
      </p>
      <Sub
        title="Taglines"
        aside={
          <CopyButton
            text={brandTaglines.join("\n")}
            asset="copy-taglines"
            label="Copy every tagline"
          >
            Copy all
          </CopyButton>
        }
      >
        <ul className={`${card} divide-y divide-[#eef3f5]`}>
          {brandTaglines.map((line) => (
            <li
              key={line}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3"
            >
              <span className="text-[15px] text-[#4e4646]">
                {line}
                <span className={`${muted} ml-3`}>{line.length}</span>
              </span>
              <CopyButton
                text={line}
                asset="copy-tagline"
                label={`Copy ${line}`}
              >
                Copy
              </CopyButton>
            </li>
          ))}
        </ul>
      </Sub>
      <Sub title="Descriptions">
        <div className="space-y-4">
          {brandDescriptions.map((entry) => (
            <CopyBlock key={entry.id} entry={entry} />
          ))}
        </div>
      </Sub>
      <Sub
        title="What it does"
        aside={
          <CopyButton
            text={brandFeatures.map((feature) => `- ${feature}`).join("\n")}
            asset="copy-features"
            label="Copy the feature list"
          >
            Copy
          </CopyButton>
        }
      >
        <ul
          className={`${card} list-disc space-y-2 py-4 pr-5 pl-9 text-[15px] leading-6 text-[#4e4646] marker:text-[#cfd7db]`}
        >
          {brandFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </Sub>
      <Sub title="Facts">
        <dl
          className={`${card} grid gap-px overflow-hidden bg-[#eef3f5] sm:grid-cols-2 lg:grid-cols-3`}
        >
          {brandFacts.map((fact) => (
            <div key={fact.label} className="bg-white px-5 py-4">
              <dt className={muted}>{fact.label}</dt>
              <dd className="mt-0.5 text-[15px] font-medium text-[#4e4646]">
                <FactValue fact={fact} />
              </dd>
            </div>
          ))}
        </dl>
      </Sub>
      <Sub
        title="Questions and answers"
        aside={
          <CopyButton
            text={faqText}
            asset="copy-faq"
            label="Copy every question and answer"
          >
            Copy all
          </CopyButton>
        }
      >
        <details className={`${card} group`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-[15px] font-medium text-[#4e4646] [&::-webkit-details-marker]:hidden">
            {brandFaq.length} answers, from what it is to what happens to your
            data
            <span
              aria-hidden
              className="text-[18px] leading-none text-[#8a9aa2] transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <dl className="divide-y divide-[#eef3f5] border-t border-[#eef3f5]">
            {brandFaq.map((entry) => (
              <div key={entry.question} className="px-5 py-4">
                <dt className="text-[15px] font-medium text-[#4e4646]">
                  {entry.question}
                </dt>
                <dd className="mt-1 text-[15px] leading-7 text-[#627c86]">
                  {entry.answer}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      </Sub>
    </Section>
  );
}

/* -------------------------------------------------------------- Partners */

/**
 * The badge is a pill in the page's own colours, so it sits a step away
 * from the usual plates: a shade under white for the light one, a lighter
 * navy than Night for the dark one.
 */
const badgePlate: Record<BrandAsset["plate"], string> = {
  ...plateClass,
  light: "bg-[#e9eff2]",
  dark: "bg-[#1a2746]",
};

function Badge({ asset }: { asset: BrandAsset }) {
  const snippet = badgeSnippet(
    siteUrl,
    asset.id as "construct-badge" | "construct-badge-dark",
  );
  return (
    <figure>
      <div
        className={`grid aspect-[3/1] place-items-center rounded-xl border border-[#e5e7eb] ${badgePlate[asset.plate]}`}
      >
        <img
          src={asset.preview}
          alt={`Badge, ${asset.name.toLowerCase()}`}
          width="205"
          height="40"
          className="h-10 w-auto"
        />
      </div>
      <figcaption className="mt-2.5 px-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-[14px] font-medium text-[#4e4646]">
            {asset.name}
          </span>
          <span className="flex flex-wrap items-center gap-x-3.5">
            <CopyButton
              text={snippet}
              asset={asset.id}
              label={`Copy the ${asset.name.toLowerCase()} badge HTML`}
            >
              Copy HTML
            </CopyButton>
            <FileLinks asset={asset} group="Badge" />
          </span>
        </div>
        <pre className="mt-2 rounded-lg bg-[#f7fbfc] px-3 py-2 text-[12px] leading-5 wrap-anywhere whitespace-pre-wrap text-[#627c86]">
          <code>{snippet}</code>
        </pre>
      </figcaption>
    </figure>
  );
}

function PartnersSection() {
  const { assets } = brandGroup("badge");
  const emailText = `Subject: ${brandEmailTemplate.subject}\n\n${brandEmailTemplate.body}`;
  return (
    <Section id="partners">
      <p className={prose}>
        For affiliates in the{" "}
        <Link to="/partner/" className={inlineLink}>
          partner program
        </Link>{" "}
        and anyone linking to us. Swap {AFFILIATE_LINK} for your own link, and
        point the badge at it.
      </p>
      <Sub title="Badge">
        <Grid columns="2">
          {assets.map((asset) => (
            <Badge key={asset.id} asset={asset} />
          ))}
        </Grid>
      </Sub>
      <Sub title="Disclosure">
        <CopyBlock
          entry={{
            id: "disclosure",
            label: "Affiliate disclosure",
            fits: "Above or below any post or page with your link",
            text: brandDisclosure,
          }}
        />
      </Sub>
      <Sub title="Posts">
        <div className="space-y-4">
          {brandCaptions.map((entry) => (
            <CopyBlock key={entry.id} entry={entry} />
          ))}
        </div>
      </Sub>
      <Sub title="Email">
        <CopyBlock
          entry={{
            id: "email",
            label: "Newsletter or list email",
            fits: "Your own list, with the disclosure already in",
            text: brandEmailTemplate.body,
          }}
          copyText={emailText}
          heading={
            <p className="mb-3 text-[15px] leading-7 font-medium text-[#4e4646]">
              {brandEmailTemplate.subject}
            </p>
          }
        />
      </Sub>
    </Section>
  );
}

/* ------------------------------------------------------------ Ad banners */

function AdBannersSection() {
  return (
    <Section id="banners">
      <AssetRow group="banners" />
    </Section>
  );
}

/* --------------------------------------------------------- Color and type */

function Swatch({ color }: { color: BrandColor }) {
  const [copied, confirm] = useConfirm();
  return (
    <div>
      <button
        type="button"
        aria-label={`Copy ${color.name} ${color.hex}`}
        onClick={() => {
          void copy(color.hex).then(() => {
            confirm();
            trackBrand(`color-${color.name.toLowerCase()}`, "copy");
          });
        }}
        className="tool-press block aspect-[4/3] w-full rounded-xl border border-black/5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01b4c8]"
        style={{ background: color.hex }}
      />
      <span aria-live="polite" className="sr-only">
        {copied ? `Copied ${color.hex}` : ""}
      </span>
      <p className="mt-2.5 px-0.5 text-[14px] leading-5 text-[#4e4646]">
        <span className="font-medium">{color.name}</span>
        <span className="ml-2 font-mono text-[13px] text-[#8a9aa2]">
          {copied ? "Copied" : color.hex}
        </span>
      </p>
      <p className={`${muted} px-0.5`}>{color.use}</p>
    </div>
  );
}

function ColorSection() {
  return (
    <Section id="color">
      <Grid columns="6">
        {brandColors.map((color) => (
          <Swatch key={color.hex} color={color} />
        ))}
      </Grid>
      <Sub title="Type">
        <div className={`${card} divide-y divide-[#eef3f5]`}>
          {brandTypefaces.map((face) => (
            <div
              key={face.name}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4"
            >
              <span
                className="text-[24px] leading-tight text-[#4e4646] sm:text-[28px]"
                style={{ fontFamily: face.family, fontStyle: face.style }}
              >
                Construct Computer
              </span>
              <span className="text-[14px] leading-6 text-[#627c86]">
                <span className="font-medium text-[#4e4646]">{face.name}</span>
                {", "}
                {face.use.toLowerCase()}
                {face.href && (
                  <>
                    {". "}
                    <a
                      href={face.href}
                      target="_blank"
                      rel="noreferrer"
                      className={inlineLink}
                    >
                      Get {face.name}
                    </a>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </Sub>
    </Section>
  );
}

/* ----------------------------------------------------------------- Usage */

function UsageSection() {
  const list =
    "list-disc space-y-2 pl-5 text-[15px] leading-6 text-[#4e4646] marker:text-[#cfd7db]";
  return (
    <Section id="usage">
      <p className={prose}>
        <strong className="font-medium text-[#4e4646]">{brandName.full}</strong>
        , in full, in titles, listings and first mentions.{" "}
        <strong className="font-medium text-[#4e4646]">
          {brandName.short}
        </strong>{" "}
        on its own in running text after that: in search it also means{" "}
        {brandName.collides.join(" and ")}. The website is{" "}
        <strong className="font-medium text-[#4e4646]">
          {brandName.domain}
        </strong>
        , all lowercase. Not {brandName.wrong.slice(0, -1).join(", ")} or{" "}
        {brandName.wrong.at(-1)}.
      </p>
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
        <div className={`${card} p-5`}>
          <h3 className={`${h3} mb-3`}>Do</h3>
          <ul className={list}>
            {brandUsage.do.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className={`${card} p-5`}>
          <h3 className={`${h3} mb-3`}>Don’t</h3>
          <ul className={list}>
            {brandUsage.dont.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className={prose}>
        {brandTerms} Something you want to do isn’t covered here? Email{" "}
        <a
          href={`mailto:${brandEmail}?subject=Brand%20and%20press`}
          className={inlineLink}
        >
          {brandEmail}
        </a>
        .
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ Page */

export function BrandPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#4e4646]">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-8 sm:px-6 lg:pt-14"
      >
        <Breadcrumbs current="Brand assets" />
        <header className="mt-6">
          <div className="max-w-2xl">
            <h1 className="font-geist text-[38px] italic leading-[1.05] tracking-[-0.02em] text-[#4e4646] sm:text-[48px] lg:text-[56px]">
              Brand assets
            </h1>
            <p className="mt-4 text-[17px] leading-7 text-[#627c86] sm:text-[18px]">
              Logos, the mascot, screenshots, ad banners and approved copy for
              Construct Computer, the AI agent platform for startups and small
              teams. Free to use when you list, review or link to us.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href={brandKit.href}
              download={brandKit.filename}
              onClick={() => trackBrand("kit", "download")}
              className={primaryButton}
            >
              Download everything
              <span className="font-normal text-white/80">zip</span>
            </a>
            <a
              href={brandDocument.href}
              target="_blank"
              rel="noopener"
              onClick={() => trackBrand(brandDocument.id, "download")}
              className={textAction}
            >
              {brandDocument.name}
              <span className="font-normal text-[#8a9aa2]">PDF</span>
            </a>
            <a href="/brand/brand.json" className={textAction}>
              brand.json
            </a>
            <span className={`${muted} sm:ml-auto`}>
              Updated{" "}
              <time dateTime={BRAND_UPDATED}>{updatedOn(BRAND_UPDATED)}</time>
            </span>
          </div>
        </header>

        <nav aria-label="On this page" className="mt-9 mb-10 sm:mt-10 sm:mb-12">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {sections.map(([id, title]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="text-[14px] text-[#627c86] underline decoration-transparent underline-offset-[5px] transition-colors hover:text-[#017b89] hover:decoration-[#01b4c8]"
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-10 sm:space-y-12">
          <LogoSection />
          <ScreenshotsSection />
          <BannerSection />
          <ColorSection />
          <VideoSection />
          <PartnersSection />
          <AdBannersSection />
          <MascotSection />
          <CopySection />
          <UsageSection />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

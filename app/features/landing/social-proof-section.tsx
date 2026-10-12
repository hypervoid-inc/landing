import { testimonials, type Testimonial } from "~/content/testimonials";

import {
  PH_DAILY_AWARD,
  PH_PRODUCT_ORIGIN,
  PH_PRODUCT_PATH,
} from "../product-hunt/config";
import "./social-proof-section.css";

const PLATFORM_NAME: Record<Testimonial["platform"], string> = {
  X: "X",
};

/** Fixed locale and zone so the prerendered date matches the hydrated one. */
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function postedOn(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: Testimonial;
  index: number;
}) {
  const platform = PLATFORM_NAME[testimonial.platform];
  return (
    <figure
      className="social-proof-card reveal-item"
      data-reveal-delay={String(Math.min(index, 2) + 2)}
      data-testimonial={testimonial.id}
    >
      {testimonial.context ? (
        <p className="social-proof-context">{testimonial.context}</p>
      ) : null}
      <blockquote className="social-proof-quote" cite={testimonial.url}>
        <p>{testimonial.excerpt.join(" … ")}</p>
      </blockquote>
      <figcaption className="social-proof-byline">
        {testimonial.avatar ? (
          <img
            src={testimonial.avatar}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            className="social-proof-avatar"
          />
        ) : (
          <span className="social-proof-monogram" aria-hidden>
            {testimonial.name.charAt(0)}
          </span>
        )}
        <span className="social-proof-who">
          <span className="social-proof-name">{testimonial.name}</span>
          <span className="social-proof-meta">
            {testimonial.handle} on {platform},{" "}
            <time dateTime={testimonial.date}>
              {postedOn(testimonial.date)}
            </time>
          </span>
        </span>
        <a
          href={testimonial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="social-proof-source"
          aria-label={`Read ${testimonial.name}'s full post on ${platform}`}
        >
          Read the post
        </a>
      </figcaption>
    </figure>
  );
}

/**
 * Public posts from people using Construct, quoted word for word and linked to
 * the original. Sits just before pricing so the proof lands right before the
 * reader weighs the cost.
 */
export function SocialProofSection() {
  if (testimonials.length === 0) return null;
  return (
    <section aria-labelledby="social-proof-heading" className="social-proof">
      <div className="social-proof-inner">
        <h2
          id="social-proof-heading"
          className="social-proof-title reveal-item"
          data-reveal-delay="1"
        >
          <span className="text-[#4e4646]">In their</span>{" "}
          <span className="font-display italic text-[#01b4c8]">own words</span>
        </h2>
        <p className="social-proof-lead reveal-item" data-reveal-delay="1">
          Posts from people using Construct, quoted as written and linked to the
          original.
        </p>
        <div
          className="social-proof-list"
          data-count={Math.min(testimonials.length, 3)}
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </div>
        <p className="social-proof-award reveal-item" data-reveal-delay="3">
          Also voted{" "}
          <a
            href={new URL(PH_PRODUCT_PATH, PH_PRODUCT_ORIGIN).toString()}
            target="_blank"
            rel="noopener noreferrer"
          >
            {PH_DAILY_AWARD} on Product Hunt
          </a>
        </p>
      </div>
    </section>
  );
}

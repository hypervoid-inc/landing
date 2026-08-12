import "./founder-note.css";

/**
 * The only human on the site. There are no customer testimonials yet, so the
 * founder's own history is the trust asset available that is actually true:
 * shipped developer tools, was also the ops team, built this because nothing
 * else could act on its own.
 *
 * Shared by `/` and `/launch` so the story cannot drift between them.
 */
export function FounderNote({ headingId }: { headingId: string }) {
  return (
    <figure className="founder-card reveal-item" data-reveal-delay="1">
      <img
        src="/assets/landing/founder/ankush.webp"
        alt=""
        aria-hidden
        width={96}
        height={96}
        className="founder-avatar"
        loading="lazy"
        decoding="async"
      />
      <div>
        <h2 id={headingId} className="founder-eyebrow">
          Why I built it
        </h2>
        <blockquote className="founder-quote">
          <p>
            I built developer tools before this. The last one reached 30,000
            users and was acquired. The engineering was never the problem. I was
            also the ops team: invoicing, CRM, support, follow-ups, all of it
            running through me on top of shipping. I did all of it myself and it
            wrecked me.
          </p>
          <p className="founder-quote-p">
            Hiring was the obvious answer and the runway math said no. So I ran
            every agent I could find. Too expensive to leave running, too slow
            when it mattered, and not one of them could act on its own. The
            models were ready. Nothing around them was. So I built the thing I
            had been looking for.
          </p>
        </blockquote>
        <figcaption className="founder-name">
          Ankush, co-founder, Construct
        </figcaption>
      </div>
    </figure>
  );
}

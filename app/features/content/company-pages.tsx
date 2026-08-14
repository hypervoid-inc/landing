import {
  ContentShell,
  Emph,
  InlineLink,
  List,
  Section,
} from "../../components/content/content-shell";
import { AffiliateLink } from "../../components/layout/affiliate-link";

export function AboutPage() {
  return (
    <ContentShell
      title="About"
      metadata="An AI employee for solo founders and small teams"
    >
      <Section title="What we're building">
        <p>
          Construct Computer gives solo founders and small teams an AI employee
          with its own cloud computer. Persistent files, memory, schedules,
          workflows, email, and connected apps sit beside live browser runs and
          a sandbox terminal, so work can finish while you do something else.
          Files saved in the workspace remain available after one conversation
          ends; live browser runs and shell state do not.
        </p>
        <p>
          You assign an outcome and Construct decides which available tools are
          needed. It can research, create artifacts, update business systems,
          and delegate bounded subtasks to temporary agents. You can inspect its
          outputs, interrupt a running turn, and correct what it remembers.
        </p>
      </Section>
      <Section title="The workstation">
        <p>
          Every Construct agent is provisioned with a complete working
          environment on day one:
        </p>
        <List>
          <li>
            A browser-based work desktop with Chat, Files, Browser, Terminal,
            Email, Calendar, Workflows, Memories, Activity, and connected apps
          </li>
          <li>
            An isolated sandbox terminal for scripts, code, and file processing,
            with a durable <Emph>/workspace</Emph> mount
          </li>
          <li>
            A persistent cloud workspace that survives across sessions, is
            searchable, and supports uploaded or agent-created files
          </li>
          <li>
            A native agent inbox on Starter and Pro for reading threads,
            drafting replies, and sending updates
          </li>
          <li>
            Web search, public-page fetching, and live browser runs for
            interactive websites, including logins completed during that run
          </li>
          <li>
            A native Calendar for scheduled work, versioned linear Workflows,
            and long-term memory you can inspect, correct, forget, or restore
          </li>
        </List>
      </Section>
      <Section title="How it works">
        <List>
          <li>
            Agent chat state runs in per-agent Durable Objects, memory runs in a
            user-owned MemorySpace, and personal or team workspaces receive
            scoped file and sandbox resources. Team members intentionally share
            team resources.
          </li>
          <li>
            The agent can search the web, operate a real browser, run code,
            manage files, send email, and act across the integrations you
            connect
          </li>
          <li>
            A live catalog of supported SaaS integrations via Composio, plus
            custom MCP servers and agent-authored workspace apps. Public
            registry submissions are not yet active in the current platform.
          </li>
          <li>
            One workspace accessible from the web, Slack, Telegram, Discord
            slash commands, and a native inbox for agent email
          </li>
          <li>
            Parallel delegation lets the primary agent assign bounded research,
            implementation, and review subtasks to temporary agents; additional
            jobs queue above the plan's concurrency limit
          </li>
        </List>
      </Section>
      <Section title="What we believe">
        <List>
          <li>
            <Emph>Transparency over magic.</Emph> Activity keeps bounded action
            summaries and best-effort reasons. Chat tool records retain bounded
            inputs and outputs.
          </li>
          <li>
            <Emph>Scoped resources by default.</Emph> Agent and memory Durable
            Objects, workspace-scoped sandbox containers, encrypted
            Construct-stored model and messaging credentials, and resource
            limits. Composio manages its own OAuth connections.
          </li>
          <li>
            <Emph>Your keys, your choice.</Emph> Use bundled model access, or
            configure supported OpenRouter, OpenAI, Anthropic, Amazon Bedrock,
            or xAI credentials on Pro in off, automatic-fallback, or exclusive
            mode.
          </li>
          <li>
            <Emph>Clear extension points.</Emph> The current v2 platform is
            proprietary. Custom MCP servers and private workspace apps provide
            supported ways to extend it; public registry submissions are not yet
            active in v2.
          </li>
        </List>
      </Section>
      <Section title="Say hello">
        <p>
          We’re a small team shipping fast and listening hard.{" "}
          <InlineLink href="https://os.construct.computer">
            Start now
          </InlineLink>
          , join us on{" "}
          <InlineLink href="https://discord.gg/puArEQHYN9">Discord</InlineLink>,
          or reach out at{" "}
          <InlineLink href="mailto:hello@construct.computer">
            hello@construct.computer
          </InlineLink>
          .
        </p>
      </Section>
    </ContentShell>
  );
}

export function AffiliatesPage() {
  return (
    <ContentShell
      title="Affiliate Program"
      metadata="Earn on every paid referral for up to 12 months"
    >
      <AffiliateApplyPanel placement="affiliates_top" />

      <Section title="What Construct is">
        <p>
          Construct Computer is an AI employee for solo founders, early
          startups, and small teams. It is not another chat window. Every agent
          gets a real cloud computer: files, memory, a browser, a terminal,
          email, a calendar, and the apps those teams already run day to day.
        </p>
        <p>
          People use it when hours are the constraint. They assign an outcome,
          Construct finishes the work across tools, and they come back to a
          report written, an inbox handled, or a recurring job already run. That
          is the product story your audience can actually feel in a demo.
        </p>
      </Section>

      <Section title="Who converts">
        <p>
          The buyers who stick are operators, not tire-kickers: founders
          juggling CRM and inbox work themselves, lean teams that cannot hire
          yet, and small businesses that want ops leverage without a full
          automation stack. If your audience already cares about AI agents,
          indie hacking, no-code ops, or shipping with a tiny team, Construct is
          a natural fit.
        </p>
        <p>
          The content that works is concrete: a screen recording of one job from
          ask to finished artifact, a workflow teardown, a weekly ops demo, or
          an honest review of what it can and cannot do. Feature lists do less
          than finished work on camera.
        </p>
      </Section>

      <Section title="What we offer partners">
        <p>
          Revenue share is paid on every paid plan your link converts, for up to
          12 months per customer. Your rate is locked when you are approved.
        </p>
        <List>
          <li>
            <Emph>Pro at $299/month at 50%:</Emph> $150 each month for up to 12
            months
          </li>
          <li>
            <Emph>Annual Pro at 50%:</Emph> $1,794 on the yearly charge
          </li>
          <li>
            Lite ($9) and Starter ($59) pay the same share on whatever plan they
            choose, also capped at 12 months
          </li>
        </List>
        <p>
          You get a unique PartnerStack link, attribution, and payouts through
          their dashboard. Create demos, use cases, reviews, or workflows, share
          the link, and earn on every conversion for the first year of that
          subscription.
        </p>
      </Section>

      <Section title="How to join">
        <p>
          Apply through PartnerStack. Approvals are manual so we can make sure
          the fit is real for both sides. If you want a walkthrough of the
          product, creative angles for your audience, or help getting set up,
          email us and we will jump on a short call.
        </p>
        <AffiliateApplyPanel placement="affiliates_bottom" compact />
        <p>
          Not the right fit for you? Pass the page to a creator whose audience
          lives in the founder and ops world. That is often the better
          introduction.
        </p>
      </Section>
    </ContentShell>
  );
}

/**
 * Pricing-page style offer: featured rate, struck standard rate, quiet limit.
 */
function AffiliateRateOffer() {
  return (
    <div aria-label="Affiliate revenue share">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <span className="font-geist text-[48px] italic leading-none text-[#01b4c8] sm:text-[56px]">
          50%
        </span>
        <span className="mb-1.5 text-[22px] font-medium leading-none text-[#b0c0c0] line-through sm:mb-2 sm:text-[26px]">
          20%
        </span>
      </div>
      <p className="mt-3 text-[15px] leading-6 text-[#4e4646]">
        Revenue share for the <Emph>first 25 partners</Emph>, for up to 12
        months per customer. After that, new partners join at 20%.
      </p>
      <p className="mt-2 text-[13px] leading-5 text-[#8a9aa2]">
        Pro at 50%: $150/month · at 20%: $60/month
      </p>
    </div>
  );
}

function AffiliateApplyPanel({
  placement,
  compact = false,
}: {
  placement: "affiliates_top" | "affiliates_bottom";
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#e5eef1] bg-white ${compact ? "px-5 py-5 sm:px-6" : "px-5 py-6 sm:px-6 sm:py-7"}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1.5">
          <p className="font-geist text-[22px] italic leading-tight text-[#4e4646] sm:text-[24px]">
            Apply on PartnerStack
          </p>
          <p className="max-w-[32rem] text-[14px] leading-[1.55] text-[#627c86] sm:text-[15px]">
            {compact
              ? "Lock in 50% while first-25 spots remain."
              : "Get your referral link and share Construct with your audience."}
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:items-end">
          <AffiliateLink
            placement={placement}
            label="Apply on PartnerStack"
            className="landing-cta font-geist inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[54px] border border-[#d9f8ff] bg-brand px-[30px] text-[15px] font-normal text-white shadow-cta-glow sm:w-auto sm:min-w-[220px] sm:text-[16px]"
          >
            Apply on PartnerStack
            <span aria-hidden>↗</span>
          </AffiliateLink>
          <InlineLink href="mailto:hello@construct.computer?subject=Affiliate%20program">
            Or email us to talk it through
          </InlineLink>
        </div>
      </div>
      {!compact ? (
        <div className="mt-6 border-t border-[#eef3f5] pt-6">
          <AffiliateRateOffer />
        </div>
      ) : null}
    </div>
  );
}

export function CareersPage() {
  return (
    <ContentShell
      title="Careers"
      metadata="We're not hiring right now - but we'd love to hear from you"
    >
      <Section title="Current status">
        <p>
          Construct is a small, focused team shipping quickly. We don’t have any
          open roles at the moment, and we’re not actively recruiting.
        </p>
        <p>
          If that changes, new openings will be posted here first and shared
          from our{" "}
          <InlineLink href="https://x.com/use_construct">
            X / Twitter
          </InlineLink>{" "}
          and{" "}
          <InlineLink href="https://linkedin.com/company/construct-computer">
            LinkedIn
          </InlineLink>
          .
        </p>
      </Section>
      <Section title="Stay in touch">
        <p>
          If you’d still like to introduce yourself for future roles, we keep an
          informal talent list. The best way to land on it is to show us
          something real:
        </p>
        <List>
          <li>
            <Emph>Send work, not a résumé.</Emph> A link to something you’ve
            built - a project, a PR, a teardown, a post - tells us more than a
            CV ever will.
          </li>
          <li>
            <Emph>Tell us what you’d want to build here.</Emph> A couple of
            sentences on the problem you’d love to own at Construct beats a
            generic cover letter.
          </li>
          <li>
            <Emph>Include your GitHub, X, or LinkedIn.</Emph> Whatever best
            represents how you think and ship.
          </li>
        </List>
        <p>
          Email us at{" "}
          <InlineLink href="mailto:careers@construct.computer">
            careers@construct.computer
          </InlineLink>
          . We read every message and keep them on file; we’ll reach out when we
          open a role that matches.
        </p>
      </Section>
      <Section title="What working here looks like">
        <p>
          For context when we do hire - this is the kind of team we’re building:
        </p>
        <List>
          <li>
            <Emph>Small and remote.</Emph> A distributed team that ships across
            time zones. Low meeting load, high written communication.
          </li>
          <li>
            <Emph>Generalists welcome.</Emph> Our work spans agents, web, infra
            (Cloudflare Workers, Durable Objects, D1, R2), and product design.
            We value range.
          </li>
          <li>
            <Emph>Ownership over process.</Emph> You pick up a problem, scope
            it, ship it, measure it. We trust people to make the call.
          </li>
          <li>
            <Emph>Build in public where we can.</Emph> The current v2 platform
            is proprietary, while selected separate projects may use their own
            published licences. We post what we’re working on when practical.
          </li>
        </List>
      </Section>
      <Section title="Other ways to contribute">
        <p>You don’t need a job here to work with us:</p>
        <List>
          <li>
            <Emph>Build an extension.</Emph> You can connect a custom MCP server
            or ask Construct to build a private workspace app. Public registry
            submissions are not yet active in the current v2 catalog.
          </li>
          <li>
            <Emph>Join the community.</Emph> Hang out on{" "}
            <InlineLink href="https://discord.gg/puArEQHYN9">
              Discord
            </InlineLink>{" "}
            - it’s where a lot of the product direction gets shaped.
          </li>
        </List>
      </Section>
      <Section title="A note on recruiters">
        <p>
          We’re not currently working with external recruiters or staffing
          agencies. Unsolicited candidate submissions will not create any
          obligation on our part.
        </p>
      </Section>
    </ContentShell>
  );
}

export function EditorialPolicyPage() {
  return (
    <ContentShell
      title="Editorial Policy"
      metadata={
        <>
          Last updated: <time dateTime="2026-07-26">July 26, 2026</time>
        </>
      }
    >
      <Section title="How we publish">
        <p>
          Construct uses AI-assisted research and drafting in its resource
          library. Drafts are proposed through pull requests and reviewed by a
          person before publication. Automation does not publish directly to the
          site.
        </p>
        <p>
          Review covers search intent, factual claims, source quality, overlap
          with existing pages, internal links, and whether the article gives
          readers a useful answer beyond a summary of other sources.
        </p>
      </Section>
      <Section title="Sources and comparisons">
        <List>
          <li>
            <Emph>Primary sources first where available.</Emph> Product
            capabilities and limits should link to current vendor documentation;
            secondary research is identified when it supplies market data or
            reporting.
          </li>
          <li>
            <Emph>Clear scope.</Emph> Comparisons state their review date and
            whether they are editorial research or hands-on testing.
          </li>
          <li>
            <Emph>No invented evidence.</Emph> We do not present generated
            examples as measured benchmarks or first-hand tests.
          </li>
          <li>
            <Emph>Construct claims.</Emph> Product details are checked against
            the current product and may change as the beta evolves.
          </li>
        </List>
      </Section>
      <Section title="Authors, dates, and corrections">
        <p>
          Articles published by the Construct Team represent the company rather
          than an individual contributor. Publication dates show when an article
          first appeared. Updated dates change only after a substantive content
          review, not simply to make a page appear fresh.
        </p>
        <p>
          To report an error or outdated claim, email{" "}
          <InlineLink href="mailto:hello@construct.computer">
            hello@construct.computer
          </InlineLink>
          . We correct material errors and update the page date when the
          correction materially changes the article.
        </p>
      </Section>
      <Section title="Our standard">
        <p>
          Our goal is useful, people-first material for teams evaluating or
          operating AI agents. We use Google’s{" "}
          <InlineLink href="https://developers.google.com/search/docs/fundamentals/creating-helpful-content">
            helpful-content self-assessment
          </InlineLink>{" "}
          as a review reference, not a formula for manufacturing search traffic.
        </p>
      </Section>
    </ContentShell>
  );
}

export function SupportPage() {
  return (
    <ContentShell title="Support" metadata="Get help with Construct Computer">
      <Section title="Where to start">
        <p>
          Before reaching out, the quickest path to an answer is usually one of
          these:
        </p>
        <List>
          <li>
            <Emph>Activity app</Emph> - review bounded action summaries with
            timestamps, status, source, and best-effort reasons.
          </li>
          <li>
            <Emph>Tool cards in chat</Emph> - expandable cards show bounded tool
            arguments and outputs; large results may be truncated.
          </li>
          <li>
            <Emph>Usage panel in Settings</Emph> - review plan limits, storage,
            current usage, and bring-your-own-key settings where available.
          </li>
        </List>
      </Section>
      <Section title="Contact us">
        <p>
          For questions, bug reports, feature requests, or anything else, you
          can reach our team at:
        </p>
        <p>
          <InlineLink href="mailto:support@construct.computer">
            support@construct.computer
          </InlineLink>
        </p>
        <p>
          We aim to respond to all inquiries within 24 hours on business days.
          Pro subscribers are prioritized.
        </p>
      </Section>
      <Section title="Community">
        <p>
          Join our community for real-time help, feature requests, and product
          announcements:
        </p>
        <List>
          <li>
            <InlineLink href="https://discord.gg/puArEQHYN9">
              Discord
            </InlineLink>{" "}
            - primary community hub for discussions, support, and feature
            requests
          </li>
          <li>
            <InlineLink href="https://x.com/use_construct">
              X / Twitter
            </InlineLink>{" "}
            - product updates and announcements
          </li>
        </List>
      </Section>
      <Section title="Reporting issues">
        <p>
          If you encounter a bug or technical issue, please include the
          following when reaching out:
        </p>
        <List>
          <li>A description of what happened and what you expected</li>
          <li>Steps to reproduce the issue, if possible</li>
          <li>
            Your browser, operating system, and the surface you used (web
            desktop, Slack, Telegram, Discord, or agent inbox)
          </li>
          <li>Screenshots or screen recordings, if applicable</li>
          <li>
            Any relevant entries from the <Emph>Activity</Emph> app in the
            desktop interface
          </li>
          <li>
            Your approximate timestamp in UTC and your account email, so we can
            correlate with server-side logs
          </li>
        </List>
        <p>
          You can submit bug reports via email at{" "}
          <InlineLink href="mailto:support@construct.computer">
            support@construct.computer
          </InlineLink>{" "}
          or through our{" "}
          <InlineLink href="https://discord.gg/puArEQHYN9">
            Discord server
          </InlineLink>
          .
        </p>
      </Section>
      <Section title="Security concerns">
        <p>
          If you discover a security vulnerability or have concerns about data
          protection, please contact us immediately at{" "}
          <InlineLink href="mailto:security@construct.computer">
            security@construct.computer
          </InlineLink>
          . We take security reports seriously and will respond within 24 hours.
          Please do not publicly disclose security vulnerabilities before we
          have had a chance to investigate and address them.
        </p>
      </Section>
      <Section title="Account & billing">
        <p>
          Subscriptions (Lite, Starter, Pro) are managed through Dodo Payments
          and can be viewed and modified from your account <Emph>Billing</Emph>{" "}
          settings. Plan limits and current usage are shown in the product and
          may change as the beta evolves.
        </p>
        <List>
          <li>
            <Emph>Upgrade / downgrade / cancel</Emph> - available directly
            in-app; changes take effect at the next billing cycle.
          </li>
          <li>
            <Emph>Bring your own key</Emph> - available on Pro. BYOK traffic
            does not count against your bundled budget and is billed directly by
            the provider.
          </li>
        </List>
        <p>
          For invoicing questions, refund requests, or general account changes,
          please email{" "}
          <InlineLink href="mailto:support@construct.computer">
            support@construct.computer
          </InlineLink>{" "}
          from the address on the account. We will verify your identity before
          making any changes.
        </p>
      </Section>
      <Section title="Access control & inbound messages">
        <p>
          Your agent can receive messages from Slack and Telegram, while Discord
          currently uses slash commands. Each platform has a configurable
          policy: <Emph>open</Emph>, <Emph>approval required</Emph>,{" "}
          <Emph>blocked</Emph>, or <Emph>closed</Emph>. Guests are blocked by
          default. Only the approval-required mode places a sender in the
          approval queue.
        </p>
        <p>
          If the agent is not responding to an inbound message, check the
          channel connection, access mode, trusted-user list, and approval
          queue.
        </p>
      </Section>
      <Section title="Data & privacy requests">
        <p>
          You have the right to request access to, correction of, or deletion of
          your personal data. To submit a data request:
        </p>
        <List>
          <li>
            Email{" "}
            <InlineLink href="mailto:support@construct.computer">
              support@construct.computer
            </InlineLink>{" "}
            with the subject line “Data Request”
          </li>
          <li>Include your account email address</li>
          <li>
            Specify whether you are requesting data access, correction, export,
            or deletion - and whether the request applies to your agent memory,
            workspace files, chat history, Activity history, or all data
          </li>
        </List>
        <p>
          You can inspect, correct, forget, or restore memories from the{" "}
          <Emph>Memories</Emph> app in the desktop. We will process formal data
          requests within 30 days. For more details, see our{" "}
          <InlineLink href="/privacy/">Privacy Policy</InlineLink>.
        </p>
      </Section>
    </ContentShell>
  );
}

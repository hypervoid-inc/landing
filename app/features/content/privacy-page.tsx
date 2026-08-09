import {
  ContentShell,
  Emph,
  InlineLink,
  List,
  Section,
  Subheading,
} from "../../components/content/content-shell";

export function PrivacyPage() {
  return (
    <ContentShell
      title="Privacy Policy"
      metadata={
        <>
          Last updated: <time dateTime="2026-08-09">August 9, 2026</time>
        </>
      }
    >
      <Section title="1. Introduction">
        <p>
          Construct Computer (“Construct,” “we,” “us,” or “our”) operates a
          cloud-based work platform with scoped personal and team workspaces
          powered by AI agents. Team members intentionally share team resources.
          This Privacy Policy explains how we collect, use, disclose, and
          safeguard your information when you visit our website at
          construct.computer, use our web platform, interact with your agent
          through Slack, Telegram, Discord slash commands, or the native agent
          inbox, or use any of our related services (collectively, the
          “Services”). By using the Services, you consent to the practices
          described in this policy.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <Subheading>2.1 Account Information</Subheading>
        <p>When you create an account or join our waitlist, we collect:</p>
        <List>
          <li>
            Your email address and name (provided directly or via Google OAuth)
          </li>
          <li>
            Google profile information if you sign in with Google, including
            your profile ID and avatar URL
          </li>
          <li>
            Any additional information you voluntarily provide, such as
            responses on our waitlist form
          </li>
        </List>
        <Subheading>2.2 Workspace & Agent Data</Subheading>
        <p>
          When you use the Construct platform, the following data is created and
          stored in user- or workspace-scoped platform resources:
        </p>
        <List>
          <li>
            <Emph>Workspace files</Emph> - any files, documents, code, or other
            content you upload or that the AI agent creates on your behalf,
            stored under scoped prefixes in Cloudflare R2
          </li>
          <li>
            <Emph>Chat & session history</Emph> - conversations between you and
            your agent across supported surfaces (responsive web desktop, Slack,
            Telegram, Discord slash commands, and agent inbox), stored in
            per-agent Cloudflare Durable Objects and the account-scoped chat
            archive
          </li>
          <li>
            <Emph>Agent memory</Emph> - long-term memory containing source
            episodes, versioned assertions, temporal context, and related
            entities. You can inspect, search, correct, forget, or restore
            memories from the Memories app
          </li>
          <li>
            <Emph>Workflows</Emph> - reusable procedures, published versions,
            run state, step results, and retry information
          </li>
          <li>
            <Emph>Scheduled jobs</Emph> - one-time and recurring agent tasks or
            workflow runs stored with their schedule and execution state
          </li>
          <li>
            <Emph>Calendar</Emph> - scheduled jobs, recurring rules, and run
            status used to coordinate background work
          </li>
          <li>
            <Emph>Agent email inbox</Emph> - each eligible user can claim one
            native address at{" "}
            <Emph>&lt;username&gt;@agents.construct.computer</Emph>; incoming
            messages, threads, and sent replies are retained to provide thread
            state
          </li>
          <li>
            <Emph>Activity history</Emph> - bounded action summaries with
            timestamp, source, status, and best-effort reasons. Tool inputs and
            outputs are not stored in the Activity feed
          </li>
          <li>
            <Emph>Access-control records</Emph> - per-platform inbound policy,
            trusted-user list, and approval records when approval-required mode
            is enabled
          </li>
        </List>
        <Subheading>2.3 Integration Credentials</Subheading>
        <p>
          If you connect third-party services to your Construct environment, we
          record connection state and credentials that Construct manages:
        </p>
        <List>
          <li>
            <Emph>Composio connected accounts</Emph> - connection identifiers
            and state for supported apps from the live Composio catalog.
            Composio manages the underlying OAuth credentials, scopes, and
            refresh process.
          </li>
          <li>
            <Emph>Direct integrations</Emph> - Slack, Telegram, and Discord
            credentials and any OAuth tokens issued directly to Construct
          </li>
          <li>
            <Emph>Custom app configuration</Emph> - endpoint, manifest, and
            permission settings for custom MCP servers and private workspace
            apps. Public registry submissions are not active in current v2.
          </li>
          <li>
            <Emph>Bring-Your-Own-Key (BYOK) API keys</Emph> - optional model
            provider keys for supported OpenRouter, OpenAI, Anthropic, Amazon
            Bedrock, or xAI access
          </li>
        </List>
        <p>
          Construct-stored BYOK keys and Slack or Discord bot credentials are
          encrypted using AES-GCM and decrypted when needed. Composio manages
          credentials for its own connected accounts.
        </p>
        <Subheading>2.4 Billing & Subscription Data</Subheading>
        <p>
          If you subscribe to a paid plan, we store the subscription state
          (tier, status, period) and a customer identifier from our payments
          processor. Payment method details (card numbers, bank info) are never
          stored by Construct - they are handled entirely by our processor, Dodo
          Payments. We also record per-call usage (service, model, token counts,
          latency, and real dollar cost via Cloudflare AI Gateway) so you can
          view usage history and we can enforce plan and per-session limits.
        </p>
        <Subheading>2.5 Technical & Usage Data</Subheading>
        <List>
          <li>IP address (used for rate limiting and security purposes)</li>
          <li>Browser type and operating system</li>
          <li>
            Authentication tokens (JSON Web Tokens stored in your browser’s
            local storage)
          </li>
          <li>
            Operational logs and metered model-usage records, including service,
            model, token counts, latency, and cost where available
          </li>
        </List>
        <Subheading>2.6 Public Website Analytics</Subheading>
        <p>
          The public Construct website uses PostHog through a first-party proxy
          for product analytics. This includes page views, navigation,
          autocapture of clicks and form interactions, heatmaps, dead clicks,
          performance metrics, exception capture, and unmasked session replay
          (including form inputs such as the beta signup email, on-page text,
          canvas, console logs, and network request headers and bodies where
          captured). PostHog may use cookies or local storage to maintain a
          browser and session identifier. We do not honor the browser Do Not
          Track signal for this analytics stack. Analytics retention and
          processing region are configured in our PostHog project.
        </p>
        <p>
          PartnerStack records referral identifiers in first-party cookies. If
          you sign up after a partner referral, we send PartnerStack your name,
          email address, and Construct customer ID. Successful subscription
          payments may also be reported with the amount, currency, and plan so
          the referring partner can receive commission.
        </p>
      </Section>

      <Section title="3. How We Use Your Information">
        <List>
          <li>
            <Emph>Providing the Services</Emph> - to operate your agent and
            sandbox, maintain your workspace, route inbound messages across
            surfaces, and facilitate the integrations you connect
          </li>
          <li>
            <Emph>Authentication</Emph> - to verify your identity via Google
            OAuth or magic-link email and manage your session
          </li>
          <li>
            <Emph>Personalization</Emph> - to enable your agent to remember
            preferences, context, and prior interactions across sessions and
            platforms
          </li>
          <li>
            <Emph>Communication</Emph> - to send authentication, workspace,
            subscription, and other transactional emails, and, with your
            consent, product updates
          </li>
          <li>
            <Emph>Billing</Emph> - to process subscriptions, meter usage against
            plan caps, and reconcile BYOK vs bundled cost
          </li>
          <li>
            <Emph>Security & abuse prevention</Emph> - to enforce rate limits,
            verify webhook signatures (Slack HMAC-SHA256, Telegram, Dodo
            Payments), detect unauthorized access, and protect infrastructure
          </li>
          <li>
            <Emph>Improvement</Emph> - to diagnose technical issues, monitor
            model behavior via aggregated analytics, and improve the Services
          </li>
        </List>
      </Section>

      <Section title="4. Third-Party Services & Data Sharing">
        <p>
          We do not sell your personal information. Your data may be shared with
          or processed by third parties only in the following circumstances. A
          current list of Construct infrastructure{" "}
          <InlineLink href="/sub-processors/">sub-processors</InlineLink> is
          published separately.
        </p>
        <Subheading>4.1 Services You Connect</Subheading>
        <p>
          When you choose to integrate third-party services with your Construct
          environment, data is exchanged with those services as necessary to
          provide the integration:
        </p>
        <List>
          <li>
            <Emph>Google</Emph> - if you sign in with Google or connect Google
            Workspace tools, your account data, calendar events, and files are
            exchanged with Google’s APIs as needed
          </li>
          <li>
            <Emph>Composio</Emph> - manages OAuth and executes tool calls
            against supported apps from its live catalog. Prompts, parameters,
            and returned results for tools you invoke are processed by Composio
            on your behalf
          </li>
          <li>
            <Emph>Slack, Telegram & Discord</Emph> - if you connect these
            services, messages, files, and metadata are processed to enable
            communication with your agent
          </li>
          <li>
            <Emph>Model providers</Emph> - prompts and conversations are sent to
            the model provider serving your plan. If you provide a BYOK
            OpenRouter key, model traffic is routed through OpenRouter - see{" "}
            <InlineLink href="https://openrouter.ai/privacy">
              OpenRouter’s privacy policy
            </InlineLink>
          </li>
          <li>
            <Emph>Composio Browser</Emph> - powers interactive browser tasks.
            Target URLs and task inputs relevant to browsing are processed by
            Composio and streamed back to the work desktop
          </li>
          <li>
            <Emph>Construct inbox</Emph> - inbound messages, drafts, sent mail,
            and thread metadata are stored to provide native agent email
          </li>
          <li>
            <Emph>Custom MCP and workspace apps</Emph> - tool parameters and
            permitted network requests are processed according to each app's
            manifest and configured connection
          </li>
        </List>
        <Subheading>4.2 Platform & Infrastructure</Subheading>
        <p>
          Construct runs on Cloudflare (Workers, Pages, Durable Objects, D1, R2,
          Queues, Vectorize, Sandbox, Workers AI, AI Gateway, Turnstile, and
          Email Sending / Routing). Data-at-rest and in-transit for platform
          state is handled by Cloudflare. Application logs and traces flow to
          Cloudflare’s observability services. We use{" "}
          <Emph>Sentry</Emph> for error monitoring and{" "}
          <Emph>PostHog</Emph> for product analytics (see section 2.6). Affiliate
          attribution may involve <Emph>PartnerStack</Emph> when you arrive
          through a partner link.
        </p>
        <Subheading>4.3 Email & Payments</Subheading>
        <p>
          We use Cloudflare Email Sending to deliver transactional emails
          (magic-link sign-in, invites, usage alerts, and founder follow-ups)
          and Cloudflare Email Routing for native agent inboxes. We use{" "}
          <Emph>Dodo Payments</Emph> to process subscriptions; Dodo holds
          payment-method data, sends billing receipts, and sends us signed
          webhooks for subscription lifecycle events. Your email address is
          shared with these providers solely for these purposes.
        </p>
        <Subheading>4.4 Legal & Safety</Subheading>
        <p>
          We may disclose your information if required by law, regulation, or
          legal process, or if we believe in good faith that disclosure is
          necessary to protect the rights, safety, or property of Construct
          Computer, our users, or the public.
        </p>
        <Subheading>4.5 Business Transfers</Subheading>
        <p>
          In the event of a merger, acquisition, reorganization, or sale of
          assets, your information may be transferred as part of that
          transaction. We will notify you of any such change.
        </p>
      </Section>

      <Section title="5. Data Storage & Security">
        <p>
          We take the security of your data seriously and implement the
          following measures:
        </p>
        <List>
          <li>
            <Emph>Scoped platform resources</Emph> - agent chat state uses
            per-agent Durable Objects, memory uses a user-owned MemorySpace, and
            sandbox containers are scoped to the active personal or team
            workspace. Team members intentionally share team resources
          </li>
          <li>
            <Emph>Encrypted Construct credentials</Emph> - Construct-stored BYOK
            keys and Slack or Discord bot credentials use AES-GCM. Composio
            manages its connected-account credentials separately
          </li>
          <li>
            <Emph>Resource & budget limits</Emph> - plans set model budgets,
            task steps, temporary-agent concurrency, storage, and schedule
            limits. Sandbox commands currently share a five-minute runtime cap
          </li>
          <li>
            <Emph>Rate limiting</Emph> - authentication endpoints, app calls,
            and API routes are rate-limited to prevent brute-force and
            resource-abuse attacks
          </li>
          <li>
            <Emph>Webhook verification</Emph> - Slack HMAC-SHA256 signatures
            with a 5-minute replay window, Telegram bot-token verification, and
            signed Dodo Payments events
          </li>
          <li>
            <Emph>JWT authentication</Emph> - sessions are managed via signed
            JSON Web Tokens with configurable expiration
          </li>
          <li>
            <Emph>Role & access control</Emph> - inbound senders are evaluated
            against the channel's access policy and trusted-user list. Guests
            are blocked by default; approval-required mode uses a review queue
          </li>
        </List>
        <p>
          Despite these measures, no system is completely secure. We cannot
          guarantee absolute security of your data.
        </p>
      </Section>

      <Section title="6. Metered Usage and Bring Your Own Key">
        <p>
          Construct supports bundled model access and optional BYOK routing:
        </p>
        <List>
          <li>
            <Emph>Bundled (default)</Emph> - your plan includes model usage
            subject to monthly and per-session limits. Usage is metered and is
            visible in your account’s usage history
          </li>
          <li>
            <Emph>BYOK</Emph> - on Pro, you may configure supported OpenRouter,
            OpenAI, Anthropic, Amazon Bedrock, or xAI credentials. Routing can
            be off, automatic fallback after bundled limits, or exclusive. BYOK
            traffic is billed directly by the provider and does not count
            against your bundled budget. Conversation content remains stored as
            needed to provide chat history and context
          </li>
        </List>
      </Section>

      <Section title="7. Data Retention">
        <p>We retain your data as follows:</p>
        <List>
          <li>
            <Emph>Account data</Emph> - retained for as long as your account is
            active. You may request deletion at any time
          </li>
          <li>
            <Emph>Virtual desktop data</Emph> - workspace files, agent memory,
            chat history, Activity history, Calendar, and agent email persist
            for as long as your account is active and are deleted when your
            account is closed
          </li>
          <li>
            <Emph>Webhook event IDs</Emph> - retained briefly for idempotency
            and replay protection, then pruned
          </li>
          <li>
            <Emph>Waitlist data</Emph> - email addresses and responses are
            retained for up to 180 days, or until you request removal
          </li>
        </List>
      </Section>

      <Section title="8. Cookies & Local Storage">
        <p>
          The Construct product stores authentication tokens in your browser’s
          local storage rather than a regular-user session cookie. The public
          website may use PostHog cookies or local storage for analytics and
          replay, and PartnerStack first-party cookies for referral attribution,
          as described above. The beta-access gate stores only a granted flag
          and timestamp, never your email address. An HTTP-only session cookie is
          used for administrative access to internal dashboards and does not
          apply to regular users.
        </p>
      </Section>
      <Section title="9. Your Rights">
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <List>
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate or incomplete data</li>
          <li>
            Request deletion of your account and all associated data, including
            your sandbox container, workspace files, memory, Activity history,
            and agent email
          </li>
          <li>
            Inspect, search, and delete individual memories at any time from the
            Memories app
          </li>
          <li>Object to or restrict the processing of your data</li>
          <li>Withdraw consent for optional processing at any time</li>
          <li>Request a portable copy of your data</li>
          <li>
            Disconnect third-party integrations and direct messaging connections
            through account settings, subject to the connected provider's
            revocation behavior
          </li>
        </List>
        <p>
          To exercise any of these rights, please contact us - see our{" "}
          <InlineLink href="/support/">Support page</InlineLink>.
        </p>
      </Section>
      <Section title="10. Children's Privacy">
        <p>
          The Services are not directed to individuals under the age of 13. We
          do not knowingly collect personal information from children under 13.
          If we become aware that we have collected data from a child under 13
          without parental consent, we will promptly delete that information and
          terminate the associated account.
        </p>
      </Section>
      <Section title="11. Autonomous Browsing & Third-Party Links">
        <p>
          Our website and your workspace may contain links to third-party
          websites. The AI agent may also navigate to third-party websites on
          your behalf via the remote browser, extract content, or submit forms.
          We are not responsible for the privacy practices or content of those
          websites, and you are responsible for tasks you delegate to the agent.
          We encourage you to review the privacy policies of any third-party
          service you connect or visit.
        </p>
      </Section>
      <Section title="12. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of material changes by posting the updated policy on this page
          with a revised “Last updated” date. Your continued use of the Services
          after any changes constitutes your acceptance of the updated policy.
        </p>
      </Section>
      <Section title="13. Contact Us">
        <p>
          If you have any questions about this Privacy Policy or wish to
          exercise your data rights, please contact us at:{" "}
          <InlineLink href="mailto:support@construct.computer">
            support@construct.computer
          </InlineLink>
          .
        </p>
      </Section>
    </ContentShell>
  );
}

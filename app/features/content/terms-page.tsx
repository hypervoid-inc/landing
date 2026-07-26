import {
  ContentShell,
  Emph,
  InlineLink,
  List,
  Section,
} from "../../components/content/content-shell";

export function TermsPage() {
  return (
    <ContentShell
      title="Terms & Conditions"
      metadata={
        <>
          Last updated: <time dateTime="2026-07-20">July 20, 2026</time>
        </>
      }
    >
      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using the Construct Computer website at
          construct.computer, the Construct web platform, interacting with your
          agent through Slack, Telegram, Discord slash commands, or the native
          agent inbox, or using any related services (collectively, the
          “Services”), you agree to be bound by these Terms & Conditions
          (“Terms”). If you do not agree to these Terms, you must not access or
          use the Services.
        </p>
      </Section>
      <Section title="2. Eligibility">
        <p>
          You must be at least 13 years of age to use the Services. By using the
          Services, you represent and warrant that you meet this age requirement
          and have the legal capacity to enter into these Terms. Access to the
          platform may be subject to a waitlist or invitation system at our
          discretion.
        </p>
      </Section>
      <Section title="3. Description of Services">
        <p>
          Construct Computer provides a cloud-based work platform with scoped
          personal and team workspaces operated by AI agents. Team members
          intentionally share team resources. The Services include, but are not
          limited to:
        </p>
        <List>
          <li>
            A browser-based work desktop with chat, files, live browser,
            terminal output, editor, inbox, Calendar, Workflows, Memories,
            connected apps, and bounded Activity summaries
          </li>
          <li>
            An AI agent that can operate the desktop on your behalf - including
            web search, remote browsing, document generation (PPTX, DOCX, XLSX,
            PDF, CSV, HTML, SVG), code and shell work, OCR, and image processing
          </li>
          <li>
            One native email address per eligible user at{" "}
            <Emph>&lt;username&gt;@agents.construct.computer</Emph>, with agent
            send/read/reply/forward support and a read-oriented human UI
          </li>
          <li>
            A native Calendar for one-time and recurring agent jobs, reusable
            versioned linear Workflows, and persistent long-term memory
          </li>
          <li>
            Parallel delegation - the ability for the primary agent to assign
            bounded work to temporary agents and combine their results
          </li>
          <li>
            Supported integrations from the live <Emph>Composio</Emph> catalog,
            direct messaging connectors for Slack, Telegram, and Discord, custom
            MCP servers, and private agent-authored workspace apps. Public
            registry submissions are not active in current v2
          </li>
          <li>
            Bounded Activity summaries, per-platform access-control policies,
            and an approval queue when approval-required mode is enabled
          </li>
          <li>
            Availability across the web desktop, Slack, Telegram, Discord slash
            commands, and the native agent inbox, sharing the same workspace
          </li>
        </List>
        <p>
          The Services are under active development. We reserve the right to
          modify, suspend, or discontinue any feature or aspect of the Services
          at any time without prior notice.
        </p>
      </Section>
      <Section title="4. Accounts & Authentication">
        <p>
          To use the platform, you must create an account using one of our
          supported authentication methods (Google OAuth or email magic-link via
          Resend). You agree to:
        </p>
        <List>
          <li>
            Provide accurate and complete information when creating your account
          </li>
          <li>
            Maintain the security of your account and not share access with
            others
          </li>
          <li>Notify us immediately of any unauthorized use of your account</li>
          <li>
            Accept responsibility for all activity that occurs under your
            account, including actions taken by the AI agent on your behalf
            across every surface
          </li>
        </List>
      </Section>
      <Section title="5. Subscription Plans & Usage Limits">
        <p>
          Construct offers fixed-price Lite, Starter, and Pro subscriptions with
          internal model-cost budgets rather than per-message billing. Prices
          and plan limits may change; current values are listed on the pricing
          page and in your in-app Billing settings. You agree that:
        </p>
        <List>
          <li>
            Each plan has usage limits, including monthly and per-session
            budgets, task iterations, parallel jobs, scheduled jobs, and
            workspace storage
          </li>
          <li>
            Features such as agent email sending, maximum task steps, concurrent
            temporary-agent jobs, scheduled jobs, and workspace storage vary by
            plan. Sandbox commands currently share a five-minute runtime cap
          </li>
          <li>
            Subscriptions are processed through <Emph>Dodo Payments</Emph>. You
            can upgrade, downgrade, or cancel at any time from the in-app
            Billing settings; changes take effect at the next billing cycle
            unless otherwise stated
          </li>
          <li>
            Attempting to circumvent or abuse budget caps, usage credits, or
            resource limits may result in suspension or termination
          </li>
        </List>
      </Section>
      <Section title="6. Bring Your Own Key (BYOK)">
        <p>
          Construct supports Bring Your Own Key on the Pro plan. BYOK can be
          off, automatic fallback after bundled limits, or exclusive. You are
          responsible for:
        </p>
        <List>
          <li>
            Providing your own credentials for supported model providers:
            OpenRouter, OpenAI, Anthropic, Amazon Bedrock, or xAI
          </li>
          <li>
            All usage charges incurred through your API keys with those
            third-party providers
          </li>
          <li>
            Complying with the terms of service of each third-party provider
            whose API keys you use within Construct
          </li>
          <li>
            Keeping your API keys secure and revoking them if you suspect
            compromise
          </li>
        </List>
        <p>
          BYOK traffic is billed according to the connected provider’s terms.
          Construct Computer is not liable for any charges, data processing, or
          other consequences arising from your use of third-party services via
          your own API keys.
        </p>
      </Section>
      <Section title="7. AI Agent & Autonomous Actions">
        <p>
          The AI agent operates within your workspace and can perform actions on
          your behalf through the tools, grants, and channel context available
          to the current turn. You acknowledge and agree that:
        </p>
        <List>
          <li>
            The agent may browse websites in a live cloud session, execute
            commands, create and modify files, send native email, post on Slack
            or Telegram, respond to Discord slash commands, schedule future
            tasks, spawn temporary agents, and call supported Composio or custom
            MCP tools as part of completing tasks you assign
          </li>
          <li>
            AI-generated outputs (including code, text, files, emails, and
            actions) may contain errors, inaccuracies, or unexpected results.
            You are responsible for reviewing and verifying all agent output
            before relying on it or sharing it externally
          </li>
          <li>
            You retain the ability to inspect outputs, interrupt a running turn,
            answer agent questions, or stop the agent. Construct does not insert
            a mandatory approval before every external side effect. You are
            ultimately responsible for actions taken in your environment
          </li>
          <li>
            Agent memory, task state, and context are based on your prior
            interactions; recall and summaries may not always be accurate or
            complete, and long sessions may undergo automatic compaction
          </li>
          <li>
            We do not guarantee the accuracy, reliability, or suitability of
            AI-generated content for any particular purpose
          </li>
        </List>
      </Section>
      <Section title="8. Acceptable Use">
        <p>You agree not to use the Services to:</p>
        <List>
          <li>Violate any applicable law, regulation, or third-party rights</li>
          <li>
            Direct the AI agent to perform illegal, harmful, abusive, or
            deceptive actions - including impersonation, unauthorized
            surveillance, or phishing
          </li>
          <li>
            Attempt to escape or circumvent container isolation, budget caps,
            rate limits, or other platform limits
          </li>
          <li>
            Interfere with or disrupt the Services, infrastructure, or other
            users’ environments
          </li>
          <li>
            Use the Services for cryptocurrency mining, DDoS, spam, mass
            unsolicited messaging, or other resource-abusive activities
          </li>
          <li>Attempt to access other users’ containers, data, or accounts</li>
          <li>
            Transmit malware, viruses, or other harmful code through the
            Services
          </li>
          <li>
            Reverse engineer, decompile, or disassemble any aspect of the
            Services except as permitted by applicable law or the Business
            Source License 1.1
          </li>
          <li>
            Use the Services to violate the terms of service of any third-party
            service (Google, Slack, Telegram, Discord, Composio apps, custom MCP
            servers, or model providers) accessed through your workspace
          </li>
          <li>
            Upload deliverables produced for you to unauthorized external hosts
            when our workspace attachment flow is available
          </li>
        </List>
      </Section>
      <Section title="9. User Content">
        <p>
          “User Content” includes all files, code, text, chat messages, emails,
          memories, calendar events, and other content that you create or that
          the AI agent creates on your behalf within your workspace environment.
          Regarding User Content:
        </p>
        <List>
          <li>You retain ownership of your User Content</li>
          <li>
            You grant Construct Computer a limited, non-exclusive license to
            store, process, transmit, and display your User Content solely as
            necessary to provide the Services to you
          </li>
          <li>
            You are responsible for ensuring that your User Content does not
            violate any laws or third-party rights
          </li>
          <li>
            We do not claim ownership over any content generated by the AI agent
            within your environment
          </li>
        </List>
      </Section>
      <Section title="10. Intellectual Property & Licensing">
        <p>
          The Construct Computer platform, including its software, design,
          branding, documentation, and related intellectual property, is owned
          by Construct Computer and its contributors. The current v2 platform,
          including its hosted agent runtime and web frontend, is proprietary
          and governed by its published licence. Separate repositories may use
          different licences stated in those repositories. Except as expressly
          permitted by an applicable licence or with our prior written consent,
          you may not copy, modify, distribute, sell, or create derivative works
          of the proprietary Services. Custom MCP servers and private workspace
          apps you create remain your intellectual property, subject to these
          Terms and any third-party services they use. Public registry
          submissions are not active in current v2.
        </p>
      </Section>
      <Section title="11. Third-Party Services & Integrations">
        <p>
          The Services integrate with and facilitate access to third-party
          services, including but not limited to:
        </p>
        <List>
          <li>
            <Emph>Composio</Emph> - supported SaaS connectors discovered from
            its live catalog, including tools such as Gmail, Google Calendar,
            Notion, Linear, Jira, HubSpot, GitHub, Airtable, and Dropbox
          </li>
          <li>
            <Emph>Direct messaging connectors</Emph> for Slack, Telegram, and
            Discord
          </li>
          <li>
            <Emph>Model providers</Emph> selected for bundled usage or connected
            by you through BYOK
          </li>
          <li>
            <Emph>Infrastructure & tooling</Emph> - Cloudflare services,
            Composio, Resend (transactional email), and Dodo Payments (billing)
          </li>
          <li>
            <Emph>Custom MCP and workspace apps</Emph> configured or created for
            your workspace
          </li>
        </List>
        <p>You acknowledge that:</p>
        <List>
          <li>
            Your use of third-party services is governed by those services’ own
            terms and privacy policies
          </li>
          <li>
            Construct Computer is not responsible for the availability,
            accuracy, content, or conduct of any third-party service or
            third-party app
          </li>
          <li>
            Third-party services may change, restrict, or discontinue their
            APIs, which could affect the functionality of Construct integrations
          </li>
          <li>
            You are responsible for complying with the terms of service of any
            third-party service you connect or access through the platform
          </li>
        </List>
      </Section>
      <Section title="12. Disclaimer of Warranties">
        <p>
          The Services are provided on an “as is” and “as available” basis.
          Construct Computer makes no warranties, whether express, implied,
          statutory, or otherwise, including implied warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Services will be
          uninterrupted, error-free, secure, or that the AI agent will produce
          accurate or reliable results. The Services are in active development
          and may contain bugs, errors, or incomplete features.
        </p>
      </Section>
      <Section title="13. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Construct Computer and its
          officers, directors, employees, contributors, and agents shall not be
          liable for any indirect, incidental, special, consequential, or
          punitive damages, or any loss of profits, revenue, data, or goodwill
          arising from: your use of or inability to use the Services; any
          actions taken by the AI agent or its sub-agents; any content or data
          loss within your virtual environment; reliance on AI-generated output;
          charges incurred through third-party API keys or connected services;
          or any unauthorized access to your account or data.
        </p>
      </Section>
      <Section title="14. Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless Construct Computer
          and its affiliates, officers, directors, employees, and contributors
          from and against any claims, liabilities, damages, losses, and
          expenses (including reasonable attorneys’ fees) arising out of or in
          connection with: your use of the Services; your violation of these
          Terms; actions taken by the AI agent in your environment; your use of
          third-party services, custom MCP servers, or workspace apps via the
          platform; or your User Content.
        </p>
      </Section>
      <Section title="15. Termination">
        <p>
          We reserve the right to suspend or terminate your access to the
          Services at any time, with or without cause, and with or without
          notice - including for violations of these Terms, suspected abuse, or
          failure to pay. You may also delete your account at any time. Upon
          termination:
        </p>
        <List>
          <li>Your right to use the Services will immediately cease</li>
          <li>
            Your sandbox container, workspace files, agent memory, chat history,
            Calendar, email inbox, and Activity history may be deleted
          </li>
          <li>
            Stored connection records and Construct-managed messaging or BYOK
            credentials will be revoked or deleted as applicable
          </li>
          <li>
            Active subscriptions are cancelled; metered usage incurred prior to
            termination remains payable
          </li>
          <li>
            Provisions of these Terms that by their nature should survive
            termination (including intellectual property, disclaimers,
            limitation of liability, and indemnification) shall survive
          </li>
        </List>
      </Section>
      <Section title="16. Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of India, without regard to conflict of law principles. Any
          disputes arising from these Terms or the Services shall be subject to
          the exclusive jurisdiction of the courts in India.
        </p>
      </Section>
      <Section title="17. Changes to These Terms">
        <p>
          We may revise these Terms at any time by posting the updated version
          on this page with a revised “Last updated” date. Your continued use of
          the Services after any changes constitutes your acceptance of the
          revised Terms. For material changes, we will make reasonable efforts
          to notify you via email or through the platform.
        </p>
      </Section>
      <Section title="18. Contact Us">
        <p>
          If you have any questions about these Terms, please contact us at:{" "}
          <InlineLink href="mailto:support@construct.computer">
            support@construct.computer
          </InlineLink>
          . For product help and bug reports, see our{" "}
          <InlineLink href="/support/">Support page</InlineLink>.
        </p>
      </Section>
    </ContentShell>
  );
}

import { INTEGRATION_MARKS } from "../integration-marks";

/**
 * Full-color brand marks for the integrations card. GitHub and Discord reuse
 * the Simple Icons paths already shipped for /launch; the multi-color marks
 * are the published brand SVGs, inlined so the card needs no image requests.
 */

const markPath = (name: string) =>
  INTEGRATION_MARKS.find((mark) => mark.name === name)?.path ?? "";

export function GithubLogo() {
  return (
    <svg viewBox="0 0 24 24.6" aria-hidden>
      <path fill="#000" d={markPath("GitHub")} />
    </svg>
  );
}

export function DiscordLogo() {
  return (
    <svg viewBox="0 3 24 18" aria-hidden>
      <path fill="#5865f2" d={markPath("Discord")} />
    </svg>
  );
}

export function TelegramLogo() {
  return (
    <svg viewBox="45 48 154 154" overflow="visible" aria-hidden>
      <path
        fill="#2aa3e0"
        d="M54.3 118.8c35-15.2 58.3-25.3 70-30.2 33.3-13.9 40.3-16.3 44.8-16.4 1 0 3.2.2 4.7 1.4 1.2 1 1.5 2.3 1.7 3.3s.4 3.1.2 4.7c-1.8 19-9.6 65.1-13.6 86.3-1.7 9-5 12-8.2 12.3-7 .6-12.3-4.6-19-9-10.6-6.9-16.5-11.2-26.8-18-11.9-7.8-4.2-12.1 2.6-19.1 1.8-1.8 32.5-29.8 33.1-32.3.1-.3.1-1.5-.6-2.1-.7-.6-1.7-.4-2.5-.2-1.1.2-17.9 11.4-50.6 33.5-4.8 3.3-9.1 4.9-13 4.8-4.3-.1-12.5-2.4-18.7-4.4-7.5-2.4-13.5-3.7-13-7.9.3-2.2 3.3-4.4 8.9-6.7z"
      />
    </svg>
  );
}

export function GmailLogo() {
  return (
    <svg viewBox="52 42 88 66" aria-hidden>
      <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
      <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
      <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
      <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
      <path
        fill="#c5221f"
        d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"
      />
    </svg>
  );
}

export function MeetLogo() {
  return (
    <svg viewBox="0 0 87.5 72" aria-hidden>
      <path
        fill="#00832d"
        d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z"
      />
      <path
        fill="#0066da"
        d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54-9.95-3z"
      />
      <path fill="#e94235" d="M20.5 0L0 20.5l10.55 3 9.95-3 2.95-9.41z" />
      <path fill="#2684fc" d="M20.5 20.5H0v31h20.5z" />
      <path
        fill="#00ac47"
        d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c1.97 1.54 4.85.135 4.85-2.37V11c0-2.535-2.945-3.925-4.91-2.32zM49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08z"
      />
      <path
        fill="#ffba00"
        d="M63.5 0h-43v20.5h29V36l20-16.57V6c0-3.315-2.685-6-6-6z"
      />
    </svg>
  );
}

export function DriveLogo() {
  return (
    <svg viewBox="0 0 87.3 78" aria-hidden>
      <path
        fill="#0066da"
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
      />
      <path
        fill="#00ac47"
        d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z"
      />
      <path
        fill="#ea4335"
        d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
      />
      <path
        fill="#00832d"
        d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
      />
      <path
        fill="#2684fc"
        d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
      />
      <path
        fill="#ffba00"
        d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
      />
    </svg>
  );
}

export function SlackLogo() {
  return (
    <svg viewBox="0 0 124.8 124.8" aria-hidden>
      <path
        fill="#e01e5a"
        d="M26.4 78.6c0 7.2-5.9 13.1-13.1 13.1S.2 85.8.2 78.6s5.9-13.1 13.1-13.1h13.1v13.1zm6.6 0c0-7.2 5.9-13.1 13.1-13.1s13.1 5.9 13.1 13.1v32.8c0 7.2-5.9 13.1-13.1 13.1S33 118.6 33 111.4V78.6z"
      />
      <path
        fill="#36c5f0"
        d="M46.1 26c-7.2 0-13.1-5.9-13.1-13.1S38.9-.2 46.1-.2s13.1 5.9 13.1 13.1V26H46.1zm0 6.7c7.2 0 13.1 5.9 13.1 13.1s-5.9 13.1-13.1 13.1H13.2C6 58.9.1 53 .1 45.8s5.9-13.1 13.1-13.1h32.9z"
      />
      <path
        fill="#2eb67d"
        d="M98.6 45.8c0-7.2 5.9-13.1 13.1-13.1s13.1 5.9 13.1 13.1-5.9 13.1-13.1 13.1H98.6V45.8zm-6.6 0c0 7.2-5.9 13.1-13.1 13.1S65.8 53 65.8 45.8V13c0-7.2 5.9-13.1 13.1-13.1S92 5.8 92 13v32.8z"
      />
      <path
        fill="#ecb22e"
        d="M78.9 98.4c7.2 0 13.1 5.9 13.1 13.1s-5.9 13.1-13.1 13.1-13.1-5.9-13.1-13.1V98.4h13.1zm0-6.6c-7.2 0-13.1-5.9-13.1-13.1s5.9-13.1 13.1-13.1h32.9c7.2 0 13.1 5.9 13.1 13.1s-5.9 13.1-13.1 13.1H78.9z"
      />
    </svg>
  );
}

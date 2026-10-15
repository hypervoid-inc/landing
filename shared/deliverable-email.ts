/**
 * Domains reserved for documentation and testing (RFC 2606, RFC 6761) never
 * accept mail. Subscribing or emailing one only earns a hard bounce, and
 * bounces are what cost a sender its reputation, so neither Listmonk nor
 * the claim email ever sees them.
 */
const RESERVED_DOMAIN = /(^|\.)(example\.(com|net|org)|example|test|invalid|localhost|local)$/i;

export function isDeliverableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return domain.includes(".") && !RESERVED_DOMAIN.test(domain);
}

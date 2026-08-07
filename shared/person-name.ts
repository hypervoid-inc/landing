/**
 * Person names for Listmonk — never invent from the email local-part.
 * Shared by schema validation and Listmonk subscribe.
 */
export function isLegitPersonName(name: string, email: string): boolean {
  const n = name.trim();
  if (n.length < 2 || n.length > 200) return false;
  if (!/[A-Za-z]/.test(n)) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const local = normalizedEmail.split("@")[0] ?? "";
  const lower = n.toLowerCase();
  if (lower === normalizedEmail) return false;
  if (local && lower === local) return false;
  return true;
}

export function isAllowedEmailDomain(email: string): boolean {
  const allowed = (process.env.ALLOWED_EMAIL_DOMAINS ?? "frt.utn.edu.ar")
    .split(",")
    .map((d) => d.trim().toLowerCase());

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  // Accept exact match OR subdomain match (e.g. alu.frt.utn.edu.ar ends with frt.utn.edu.ar)
  return allowed.some((d) => domain === d || domain.endsWith("." + d));
}

export function isAllowedEmailDomain(email: string): boolean {
  const allowed = (process.env.ALLOWED_EMAIL_DOMAINS ?? "frt.utn.edu.ar")
    .split(",")
    .map((d) => d.trim().toLowerCase());

  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowed.includes(domain);
}

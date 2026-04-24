const SENSITIVE_KEYS = ["dni", "email", "security_code", "password", "phone", "legajo"];

export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.includes(k.toLowerCase()) ? "[REDACTED]" : v,
    ])
  );
}

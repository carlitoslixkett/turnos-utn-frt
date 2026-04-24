import { describe, it, expect } from "vitest";
import { redact } from "@/lib/utils/redact";

describe("redact", () => {
  it("redacts sensitive keys", () => {
    const result = redact({ email: "user@test.com", note_id: "abc-123" });
    expect(result.email).toBe("[REDACTED]");
    expect(result.note_id).toBe("abc-123");
  });

  it("redacts dni", () => {
    const result = redact({ dni: "12345678", action: "create" });
    expect(result.dni).toBe("[REDACTED]");
    expect(result.action).toBe("create");
  });

  it("redacts security_code", () => {
    const result = redact({ security_code: "123456", turn_id: "uuid" });
    expect(result.security_code).toBe("[REDACTED]");
    expect(result.turn_id).toBe("uuid");
  });

  it("returns empty object unchanged", () => {
    expect(redact({})).toEqual({});
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the env variable before importing
const mockEnv = { ALLOWED_EMAIL_DOMAINS: "frt.utn.edu.ar" };

vi.mock("process", () => ({
  env: mockEnv,
}));

// Import after mock setup
import { isAllowedEmailDomain } from "@/lib/auth/validate-domain";

describe("isAllowedEmailDomain", () => {
  it("allows email with default domain", () => {
    expect(isAllowedEmailDomain("juan@frt.utn.edu.ar")).toBe(true);
  });

  it("rejects email with wrong domain", () => {
    expect(isAllowedEmailDomain("juan@gmail.com")).toBe(false);
  });

  it("rejects email without @", () => {
    expect(isAllowedEmailDomain("notanemail")).toBe(false);
  });

  it("is case-insensitive on domain", () => {
    expect(isAllowedEmailDomain("juan@FRT.UTN.EDU.AR")).toBe(true);
  });
});

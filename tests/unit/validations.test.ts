import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/lib/validations/auth";
import { createTurnSchema, cancelTurnSchema } from "@/lib/validations/turns";
import { createIntervalSchema } from "@/lib/validations/intervals";

describe("registerSchema", () => {
  const valid = {
    full_name: "Juan Pérez",
    dni: "12345678",
    email: "juan@frt.utn.edu.ar",
    password: "Password1",
  };

  it("accepts valid data", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short full_name", () => {
    const r = registerSchema.safeParse({ ...valid, full_name: "Jo" });
    expect(r.success).toBe(false);
  });

  it("rejects non-numeric dni", () => {
    const r = registerSchema.safeParse({ ...valid, dni: "abc123" });
    expect(r.success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    const r = registerSchema.safeParse({ ...valid, password: "password1" });
    expect(r.success).toBe(false);
  });

  it("rejects password without number", () => {
    const r = registerSchema.safeParse({ ...valid, password: "Password" });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "pass" }).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(loginSchema.safeParse({ email: "notanemail", password: "pass" }).success).toBe(false);
  });
});

describe("cancelTurnSchema", () => {
  it("accepts valid 6-digit code", () => {
    expect(
      cancelTurnSchema.safeParse({
        turn_id: "550e8400-e29b-41d4-a716-446655440000",
        security_code: "123456",
      }).success
    ).toBe(true);
  });

  it("rejects 5-digit code", () => {
    expect(
      cancelTurnSchema.safeParse({
        turn_id: "550e8400-e29b-41d4-a716-446655440000",
        security_code: "12345",
      }).success
    ).toBe(false);
  });
});

describe("createIntervalSchema", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const futureEnd = new Date(Date.now() + 2 * 86400000).toISOString();

  it("accepts valid interval", () => {
    expect(
      createIntervalSchema.safeParse({
        name: "Intervalo de prueba",
        date_start: future,
        date_end: futureEnd,
        turn_duration_minutes: 15,
        note_ids: ["550e8400-e29b-41d4-a716-446655440000"],
      }).success
    ).toBe(true);
  });

  it("rejects when end is before start", () => {
    expect(
      createIntervalSchema.safeParse({
        name: "Intervalo",
        date_start: futureEnd,
        date_end: future,
        turn_duration_minutes: 15,
        note_ids: ["550e8400-e29b-41d4-a716-446655440000"],
      }).success
    ).toBe(false);
  });

  it("rejects empty note_ids", () => {
    expect(
      createIntervalSchema.safeParse({
        name: "Intervalo",
        date_start: future,
        date_end: futureEnd,
        turn_duration_minutes: 15,
        note_ids: [],
      }).success
    ).toBe(false);
  });
});

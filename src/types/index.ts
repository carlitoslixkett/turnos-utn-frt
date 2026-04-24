export type { Database } from "./database";
export type { Json } from "./database";

export type UserType = "student" | "worker";
export type WorkerRole = "admin";
export type TurnStatus = "pending" | "attended" | "lost" | "cancelled";
export type NewsStatus = "posted" | "pending" | "deleted";

// Derived types from the generated Database type for convenience
import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type Interval = Database["public"]["Tables"]["intervals"]["Row"];
export type IntervalNote = Database["public"]["Tables"]["interval_notes"]["Row"];
export type Turn = Database["public"]["Tables"]["turns"]["Row"];
export type News = Database["public"]["Tables"]["news"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_log"]["Row"];
export type WorkerRoleEntry = Database["public"]["Tables"]["worker_roles"]["Row"];

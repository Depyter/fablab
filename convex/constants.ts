export const FileStatus = {
  CLAIMED: "claimed",
  ORPHANED: "orphaned",
} as const;

export const ServiceStatus = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
} as const;

export const ResourceCategory = {
  ROOM: "room",
  MACHINE: "machine",
  TOOL: "tool",
  MISC: "misc",
} as const;

export const ResourceStatus = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  UNDER_MAINTENANCE: "Under Maintenance",
} as const;

export const ProjectServiceType = {
  SELF_SERVICE: "self-service",
  FULL_SERVICE: "full-service",
} as const;

export const ProjectMaterial = {
  PROVIDE_OWN: "provide-own",
  BUY_FROM_LAB: "buy-from-lab",
} as const;

export const ProjectPricing = {
  NORMAL: "normal",
  UP: "UP",
  SPECIAL: "Special",
} as const;

export const ProjectStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
} as const;

export const PaymentMode = {
  CASH: "cash",
  GCASH: "gcash",
  BANK_TRANSFER: "bank transfer",
  OTHERS: "others",
} as const;

export const UserRole = {
  ADMIN: "admin",
  MAKER: "maker",
  CLIENT: "client",
} as const;

// Type helpers for extracting the union types from the constants
export type FileStatusType = (typeof FileStatus)[keyof typeof FileStatus];
export type ServiceStatusType =
  (typeof ServiceStatus)[keyof typeof ServiceStatus];
export type ResourceCategoryType =
  (typeof ResourceCategory)[keyof typeof ResourceCategory];
export type ResourceStatusType =
  (typeof ResourceStatus)[keyof typeof ResourceStatus];
export type ProjectServiceTypeType =
  (typeof ProjectServiceType)[keyof typeof ProjectServiceType];
export type ProjectMaterialType =
  (typeof ProjectMaterial)[keyof typeof ProjectMaterial];
export type ProjectPricingType =
  (typeof ProjectPricing)[keyof typeof ProjectPricing];
export type ProjectStatusType =
  (typeof ProjectStatus)[keyof typeof ProjectStatus];
export type PaymentModeType = (typeof PaymentMode)[keyof typeof PaymentMode];
export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

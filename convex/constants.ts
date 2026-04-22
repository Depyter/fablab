export const FileStatus = {
  CLAIMED: "claimed",
  ORPHANED: "orphaned",
} as const;

export const ServiceStatus = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
} as const;

export const MaterialCategory = {
  FILAMENT: "Filament",
  RESIN: "Resin",
  WOOD: "Wood",
  ACRYLIC: "Acrylic",
  FOAM: "Foam",
  FABRIC: "Fabric",
  METAL: "Metal",
  PAPER: "Paper",
  VINYL: "Vinyl",
  ELECTRONICS: "Electronics",
  KITS: "Kits",
  MISC: "Misc",
} as const;

export const MaterialUnit = {
  // Weight
  GRAMS: "g",
  KILOGRAMS: "kg",
  // Length
  METERS: "m",
  CENTIMETERS: "cm",
  MILLIMETERS: "mm",
  // Area
  SQUARE_METERS: "m²",
  // Volume
  MILLILITERS: "mL",
  LITERS: "L",
  // Count
  PIECES: "pcs",
  SHEETS: "sheets",
  ROLLS: "rolls",
  SETS: "sets",
} as const;

export const MaterialStatus = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;

export const ResourceUnit = {
  MINUTE: "minute",
  HOUR: "hour",
  DAY: "day",
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
  WORKSHOP: "workshop",
} as const;

export const ProjectMaterial = {
  PROVIDE_OWN: "provide-own",
  BUY_FROM_LAB: "buy-from-lab",
} as const;

export const ProjectStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  PAID: "paid",
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

// ---------------------------------------------------------------------------
// Extension → MIME type map for all project-relevant file types.
// Used to resolve reliable MIME types on systems (e.g. Linux) where the
// browser may leave file.type as an empty string.
// ---------------------------------------------------------------------------

export const EXT_MIME: Record<string, string> = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  // Videos
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  // 3D / CAD
  stl: "model/stl",
  obj: "model/obj",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  "3mf": "application/vnd.ms-3mfdocument",
  step: "application/step",
  stp: "application/step",
  // Design & documents
  pdf: "application/pdf",
  dxf: "image/vnd.dxf",
  dwg: "image/vnd.dwg",
  ai: "application/postscript",
  eps: "application/postscript",
  psd: "image/vnd.adobe.photoshop",
};

// ---------------------------------------------------------------------------
// File validation constants
// ---------------------------------------------------------------------------

export const FILE_CATEGORIES: Record<string, string[]> = {
  Images: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/avif",
    "image/svg+xml",
    "image/x-icon",
  ],
  Videos: [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
  ],
  "3D / CAD": [
    "model/stl",
    "model/obj",
    "model/gltf-binary",
    "model/gltf+json",
    "application/vnd.ms-3mfdocument",
    "application/step",
  ],
  "Design & Documents": [
    "application/pdf",
    "image/vnd.dxf",
    "image/vnd.dwg",
    "application/postscript",
    "image/vnd.adobe.photoshop",
  ],
};

export const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/avif",
  "image/svg+xml",
  "image/x-icon",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  // 3D / CAD
  "model/stl",
  "model/obj",
  "model/gltf-binary",
  "model/gltf+json",
  "application/vnd.ms-3mfdocument",
  "application/step",
  // Design & documents
  "application/pdf",
  "image/vnd.dxf",
  "image/vnd.dwg",
  "application/postscript",
  "image/vnd.adobe.photoshop",
]);

/** 100 MB hard limit per file. */
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

// Type helpers for extracting the union types from the constants
export type MaterialCategoryType =
  (typeof MaterialCategory)[keyof typeof MaterialCategory];
export type MaterialUnitType = (typeof MaterialUnit)[keyof typeof MaterialUnit];
export type MaterialStatusType =
  (typeof MaterialStatus)[keyof typeof MaterialStatus];
export type ResourceUnitType = (typeof ResourceUnit)[keyof typeof ResourceUnit];
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
export type ProjectStatusType =
  (typeof ProjectStatus)[keyof typeof ProjectStatus];
export type PaymentModeType = (typeof PaymentMode)[keyof typeof PaymentMode];
export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const PROJECT_STATUS_LABELS: Record<ProjectStatusType, string> = {
  pending: "Review",
  approved: "Fabrication",
  completed: "Payment",
  paid: "Claim",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const PROJECT_STATUS_TRANSITIONS: Record<
  ProjectStatusType,
  readonly ProjectStatusType[]
> = {
  pending: [ProjectStatus.APPROVED, ProjectStatus.REJECTED, ProjectStatus.CANCELLED],
  approved: [ProjectStatus.PENDING, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  completed: [ProjectStatus.APPROVED, ProjectStatus.PAID],
  paid: [ProjectStatus.COMPLETED],
  rejected: [ProjectStatus.PENDING],
  cancelled: [ProjectStatus.PENDING],
};

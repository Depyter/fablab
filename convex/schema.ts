import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  FileStatus,
  MaterialStatus,
  ResourceUnit,
  PaymentMode,
  ProjectMaterial,
  ProjectStatus,
  ResourceCategory,
  ResourceStatus,
  ServiceStatus,
  UserRole,
} from "./constants";

export default defineSchema({
  // --------------------------------------------------------
  // EXISTING: Files
  // --------------------------------------------------------
  files: defineTable({
    originalName: v.string(),
    storageId: v.id("_storage"),
    type: v.string(),
    status: v.union(
      v.literal(FileStatus.CLAIMED),
      v.literal(FileStatus.ORPHANED),
    ),
    uploadedBy: v.optional(v.id("userProfile")),
  })
    .index("by_storageId", ["storageId"])
    .index("status", ["status"]),

  // --------------------------------------------------------
  // 1. SERVICES: Defines the offering and pricing rules
  // --------------------------------------------------------
  services: defineTable({
    name: v.string(),
    slug: v.string(),
    images: v.array(v.id("_storage")),
    samples: v.array(v.id("_storage")),
    description: v.string(),
    requirements: v.array(v.string()),
    fileTypes: v.array(v.string()),
    resources: v.optional(v.array(v.id("resources"))),

    status: v.union(
      v.literal(ServiceStatus.UNAVAILABLE),
      v.literal(ServiceStatus.AVAILABLE),
    ),
    serviceCategory: v.union(
      v.object({
        type: v.literal("WORKSHOP"),
        schedules: v.array(
          v.object({
            date: v.number(),
            timeSlots: v.array(
              v.object({
                startTime: v.number(),
                endTime: v.number(),
                maxSlots: v.number(),
                usedUpSlots: v.optional(v.number()),
              }),
            ),
          }),
        ),
        // Pricing: one-time flat payment
        amount: v.number(),
        variants: v.optional(
          v.array(v.object({ name: v.string(), amount: v.number() })),
        ),
      }),
      v.object({
        type: v.literal("FABRICATION"),
        availableDays: v.optional(v.array(v.number())),
        materials: v.optional(v.array(v.id("materials"))),
        // Pricing: variable time-based cost
        setupFee: v.number(),
        unitName: v.union(
          v.literal(ResourceUnit.MINUTE),
          v.literal(ResourceUnit.HOUR),
          v.literal(ResourceUnit.DAY),
        ),
        timeRate: v.number(),
        variants: v.optional(
          v.array(
            v.object({
              name: v.string(),
              setupFee: v.number(),
              timeRate: v.number(),
            }),
          ),
        ),
      }),
    ),
  }).index("by_slug", ["slug"]),

  // --------------------------------------------------------
  // 2. RESOURCES: Non-consumable, bookable assets (Time-based)
  // --------------------------------------------------------
  resources: defineTable({
    name: v.string(),
    category: v.union(
      v.literal(ResourceCategory.ROOM),
      v.literal(ResourceCategory.MACHINE),
      v.literal(ResourceCategory.TOOL),
      v.literal(ResourceCategory.MISC),
    ),
    type: v.string(),
    images: v.array(v.id("_storage")),
    description: v.string(),
    status: v.union(
      v.literal(ResourceStatus.UNAVAILABLE),
      v.literal(ResourceStatus.AVAILABLE),
      v.literal(ResourceStatus.UNDER_MAINTENANCE),
    ),
  }).index("by_category", ["category"]),

  // --------------------------------------------------------
  // 3. MATERIALS: Consumable inventory (Quantity-based)
  // --------------------------------------------------------
  materials: defineTable({
    name: v.string(),
    category: v.string(), // e.g., "Filament", "Wood", "Kits"
    unit: v.string(), // e.g., "grams", "sheets", "pcs"
    currentStock: v.number(),
    costPerUnit: v.optional(v.number()),
    pricePerUnit: v.optional(v.number()),
    reorderThreshold: v.optional(v.number()),
    color: v.optional(v.string()),
    status: v.union(
      v.literal(MaterialStatus.IN_STOCK),
      v.literal(MaterialStatus.LOW_STOCK),
      v.literal(MaterialStatus.OUT_OF_STOCK),
    ),
    image: v.optional(v.id("_storage")),
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"]),

  // --------------------------------------------------------
  // 4. RESOURCE USAGE: Atomic session records
  // --------------------------------------------------------
  resourceUsage: defineTable({
    projectId: v.id("projects"),
    resource: v.optional(v.id("resources")),
    service: v.id("services"),

    startTime: v.number(),
    endTime: v.number(),

    // Snapshot of cost and naming at time of session — drives historical records
    snapshot: v.object({
      name: v.string(),
      costAtTime: v.number(),
      unit: v.string(),
    }),

    // Inventory deductions mapped to this specific session
    materialsUsed: v.optional(
      v.array(
        v.object({
          materialId: v.id("materials"),
          amountUsed: v.number(),
          snapshot: v.optional(
            v.object({
              name: v.string(),
              unit: v.string(),
              pricePerUnit: v.optional(v.number()),
              costPerUnit: v.optional(v.number()),
            }),
          ),
        }),
      ),
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_service", ["service"])
    .index("by_resource_startTime", ["resource", "startTime"]),

  // --------------------------------------------------------
  // 5. PROJECTS: Parent container — ledger of sessions
  // --------------------------------------------------------
  projects: defineTable({
    name: v.string(),
    description: v.string(),

    // Structural type: determines session logic
    type: v.union(v.literal("WORKSHOP"), v.literal("FABRICATION")),

    // How the session is fulfilled
    fulfillmentMode: v.union(
      v.literal("self-service"),
      v.literal("full-service"),
      v.literal("staff-led"),
    ),

    material: v.union(
      v.literal(ProjectMaterial.PROVIDE_OWN),
      v.literal(ProjectMaterial.BUY_FROM_LAB),
    ),
    requestedMaterials: v.optional(v.array(v.id("materials"))),

    userId: v.id("userProfile"),
    assignedMaker: v.optional(v.id("userProfile")),
    service: v.id("services"),

    // Aggregate invoice derived from resourceUsage sessions
    totalInvoice: v.optional(
      v.object({
        subtotal: v.number(),
        tax: v.number(),
        total: v.number(),
      }),
    ),
    pricingSnapshot: v.optional(
      v.object({
        setupFee: v.number(),
        timeCost: v.number(),
        materialCost: v.number(),
        total: v.number(),
        duration: v.number(),
        rate: v.number(),
        unitName: v.string(),
      }),
    ),

    pricing: v.string(), // Chosen variant name (e.g., "Default", "UP", "KID")

    status: v.union(
      v.literal(ProjectStatus.PENDING),
      v.literal(ProjectStatus.APPROVED),
      v.literal(ProjectStatus.REJECTED),
      v.literal(ProjectStatus.COMPLETED),
      v.literal(ProjectStatus.CANCELLED),
      v.literal(ProjectStatus.PAID),
    ),
    receipt: v.optional(v.id("receipts")),
    files: v.optional(v.array(v.string())),
    notes: v.string(),
    searchText: v.string(),
  })
    .index("by_userProfile", ["userId"])
    .index("by_status", ["status"])
    .searchIndex("search_body", {
      searchField: "searchText",
      filterFields: ["status"],
    }),

  receipts: defineTable({
    receiptString: v.string(),
    paymentMode: v.union(
      v.literal(PaymentMode.CASH),
      v.literal(PaymentMode.GCASH),
      v.literal(PaymentMode.BANK_TRANSFER),
      v.literal(PaymentMode.OTHERS),
    ),
    proof: v.string(),
    files: v.optional(v.array(v.id("_storage"))),
  }),

  rooms: defineTable({
    name: v.string(),
    color: v.string(),
    lastMessageText: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    unreadCount: v.optional(v.number()),
    createdVia: v.union(v.literal("Project"), v.literal("Admin/Maker")),
    creator: v.id("userProfile"),
  }).index("by_creator", ["creator"]),

  roomMembers: defineTable({
    roomId: v.id("rooms"),
    participantId: v.id("userProfile"),
  })
    .index("by_participantId", ["participantId"])
    .index("by_roomId_participantId", ["roomId", "participantId"]),

  threads: defineTable({
    roomId: v.id("rooms"),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    createdBy: v.optional(v.id("userProfile")),
    lastMessageText: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    unreadCount: v.optional(v.number()),
    archived: v.union(v.literal("Archived"), v.literal("Active")),
    messageCount: v.optional(v.number()),
  })
    .index("by_roomId", ["roomId"])
    .index("projectId", ["projectId"]),

  threadReads: defineTable({
    threadId: v.id("threads"),
    userId: v.id("userProfile"),
    lastReadMessageCount: v.number(),
  }).index("by_userId_threadId", ["userId", "threadId"]),

  messages: defineTable({
    content: v.string(),
    file: v.optional(v.array(v.id("_storage"))),
    sender: v.union(v.string(), v.id("userProfile")),
    room: v.id("rooms"),
    threadId: v.id("threads"),
  })
    .index("by_room_and_thread", ["room", "threadId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["room", "threadId", "sender"],
      staged: false,
    }),

  userProfile: defineTable({
    userId: v.string(),
    profilePic: v.optional(v.id("_storage")),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal(UserRole.ADMIN),
      v.literal(UserRole.MAKER),
      v.literal(UserRole.CLIENT),
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_role", ["role"])
    .searchIndex("search_email", {
      searchField: "email",
    }),
});

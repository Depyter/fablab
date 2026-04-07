import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  FileStatus,
  PaymentMode,
  ProjectMaterial,
  ProjectPricing,
  ProjectServiceType,
  ProjectStatus,
  ResourceCategory,
  ResourceStatus,
  ServiceStatus,
  UserRole,
} from "./constants";

export default defineSchema({
  files: defineTable({
    originalName: v.string(),
    storageId: v.id("_storage"),
    type: v.string(),
    status: v.union(
      v.literal(FileStatus.CLAIMED),
      v.literal(FileStatus.ORPHANED),
    ),
  })
    .index("by_storageId", ["storageId"])
    .index("status", ["status"]),

  // Services that the users can see and admin can manage
  services: defineTable({
    name: v.string(),
    slug: v.string(),
    images: v.array(v.id("_storage")), // array of fileids in convex
    samples: v.array(v.id("_storage")),
    regularPrice: v.number(),
    upPrice: v.number(),
    unitPrice: v.string(),
    description: v.string(),
    requirements: v.array(v.string()),
    fileTypes: v.array(v.string()),
    resources: v.optional(v.array(v.id("resources"))),
    status: v.union(
      v.literal(ServiceStatus.UNAVAILABLE),
      v.literal(ServiceStatus.AVAILABLE),
    ),
  }).index("by_slug", ["slug"]),

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

  resourceUsage: defineTable({
    resource: v.optional(v.id("resources")),
    service: v.id("services"),
    project: v.id("projects"),
    maker: v.optional(v.id("userProfile")),
    startTime: v.number(),
    endTime: v.number(),
    date: v.number(),
  })
    .index("by_date_resource_startTime", ["date", "resource", "startTime"])
    .index("by_project", ["project"]),

  projects: defineTable({
    name: v.string(),
    description: v.string(),
    serviceType: v.union(
      v.literal(ProjectServiceType.SELF_SERVICE),
      v.literal(ProjectServiceType.FULL_SERVICE),
    ),
    material: v.union(
      v.literal(ProjectMaterial.PROVIDE_OWN),
      v.literal(ProjectMaterial.BUY_FROM_LAB),
    ),
    userId: v.id("userProfile"),
    service: v.id("services"),
    pricing: v.union(
      v.literal(ProjectPricing.NORMAL),
      v.literal(ProjectPricing.UP),
      v.literal(ProjectPricing.SPECIAL),
    ),
    status: v.union(
      v.literal(ProjectStatus.PENDING),
      v.literal(ProjectStatus.APPROVED),
      v.literal(ProjectStatus.REJECTED),
      v.literal(ProjectStatus.COMPLETED),
    ),
    receipt: v.optional(v.id("receipts")),
    files: v.optional(v.array(v.string())), // storageId given by the frontend
    notes: v.string(),
  }).index("by_userProfile", ["userId"]),

  receipts: defineTable({
    receiptNumber: v.int64(),
    paymentMode: v.union(
      v.literal(PaymentMode.CASH),
      v.literal(PaymentMode.GCASH),
      v.literal(PaymentMode.BANK_TRANSFER),
      v.literal(PaymentMode.OTHERS),
    ),
    booking: v.id("bookings"),
    proof: v.string(), // transaction number of the proof
    image: v.optional(v.id("_storage")), // optional file upload for proof of payment
  }),

  rooms: defineTable({
    name: v.string(),
    color: v.string(), // can be a string literal if need be down the road
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
    // DIRECTION 2 (Everything is a thread):
    // To normalize this further, you could make `threadId: v.id("threads")` required.
    // The main room chat would just be a default "General" thread created alongside the room.
    // This fully normalizes the data and simplifies queries, as every message always belongs to a thread.
    threadId: v.optional(v.id("threads")),
  })
    // DIRECTION 1: Compound index to efficiently query both main room and specific threads
    // without needing .filter() scans.
    .index("by_room_and_thread", ["room", "threadId"]),

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
    .index("by_role", ["role"]),
});

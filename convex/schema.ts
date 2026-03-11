import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Services that the users can see and admin can manage
  services: defineTable({
    name: v.string(),
    images: v.array(v.id("_storage")), // array of fileids in convex
    samples: v.array(v.id("_storage")),
    regularPrice: v.number(),
    upPrice: v.number(),
    unitPrice: v.string(),
    description: v.string(),
    requirements: v.array(v.string()),
    status: v.union(v.literal("Unavailable"), v.literal("Available")),
  }).index("by_name", ["name"]),

  machines: defineTable({
    name: v.string(),
    description: v.string(),
    service: v.id("services"),
    status: v.union(v.literal("Unavailable"), v.literal("Available")),
  }).index("by_service", ["service"]),

  // To show which machines have jobs
  jobs: defineTable({
    machine: v.id("machines"),
    project: v.id("projects"),
    start: v.number(),
    end: v.number(),
    complexity: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    ),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    requester: v.id("userProfile"), // must be admin or maker
  })
    .index("by_machine", ["machine"])
    .index("by_project", ["project"])
    .index("by_requester", ["requester"]),

  projects: defineTable({
    alias: v.string(),
    // bookingNumber: v.int64(),
    userId: v.id("userProfile"),
    service: v.id("services"),
    pricing: v.union(
      v.literal("normal"),
      v.literal("UP"),
      v.literal("Special"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    receipt: v.optional(v.id("receipts")),
    files: v.optional(v.array(v.string())), // storageId given by the frontend
    specialInstructions: v.string(),
  }).index("by_userProfile", ["userId"]),

  receipts: defineTable({
    receiptNumber: v.int64(),
    paymentMode: v.union(
      v.literal("cash"),
      v.literal("gcash"),
      v.literal("bank transfer"),
      v.literal("others"),
    ),
    booking: v.id("bookings"),
    proof: v.string(), // transaction number of the proof
    image: v.optional(v.id("_storage")), // optional file upload for proof of payment
  }),

  rooms: defineTable({
    name: v.string(),
    // members: v.union(v.id("roomMembers"), v.null()),
    color: v.string(), // can be a string literal if need be down the road
    lastMessageId: v.optional(v.id("messages")),
  }),

  roomMembers: defineTable({
    roomId: v.id("rooms"),
    participantId: v.id("userProfile"),
  })
    .index("by_roomId", ["roomId"])
    .index("by_participantId", ["participantId"]),

  messages: defineTable({
    content: v.string(),
    file: v.optional(v.id("_storage")),
    sender: v.string(),
    room: v.id("rooms"),
  }).index("by_room", ["room"]),

  userProfile: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("maker"), v.literal("client")),
  })
    .index("by_userId", ["userId"])
    .index("by_role", ["role"]),
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Services that the users can see and admin can manage
  services: defineTable({
    name: v.string(),
    images: v.array(v.id("_storage")), // array of fileids in convex
    description: v.string(),
    type: v.string(),
    status: v.union(v.literal("Unavailable"), v.literal("Available")),
  }),

  bookings: defineTable({
    bookingNumber: v.int64(),
    userId: v.id("userProfile"),
    service: v.id("services"),
    pricing: v.union(
      v.literal("normal"),
      v.literal("UP"),
      v.literal("Special"),
    ),
    receipt: v.optional(v.id("receipts")),
    files: v.optional(v.array(v.string())), // storageId given by the frontend
    specialInstructions: v.string(),
  }),

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
    members: v.id("roomMembers"),
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
  }).index("by_userId", ["userId"]),
});

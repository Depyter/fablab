import { v } from "convex/values";
import { authQuery } from "../helper";
import { loadCalendarBookings, loadCalendarFrame } from "./helper";

export const getCalendarFrame = authQuery({
  role: ["admin", "maker", "client"],
  args: {},
  handler: async (ctx) => loadCalendarFrame(ctx),
});

export const getCalendarBookings = authQuery({
  role: ["admin", "maker", "client"],
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => loadCalendarBookings(ctx, args),
});

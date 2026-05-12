import { v } from "convex/values";
import { authQuery } from "../helper";
import {
  loadCalendarBookings,
  loadCalendarFrame,
  loadServiceCalendarBookings,
} from "./helper";

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
    tab: v.union(v.literal("services"), v.literal("resources")),
  },
  handler: async (ctx, args) => {
    if (args.tab === "services") {
      return loadServiceCalendarBookings(ctx, args);
    }
    return loadCalendarBookings(ctx, args);
  },
});

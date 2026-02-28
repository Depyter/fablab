import { query } from "../_generated/server";

export const getServices = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    return services;
  },
});

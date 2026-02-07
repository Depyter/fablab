import { mutation } from "./_generated/server";

// The file size is not limited, but upload POST request has a 2 minute timeout.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

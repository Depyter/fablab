import { authQuery } from "../helper";

export const getMaterials = authQuery({
  role: ["admin", "maker"],
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materials").collect();

    return await Promise.all(
      materials.map(async (material) => {
        const imageUrl = material.image
          ? await ctx.storage.getUrl(material.image)
          : null;
        return {
          ...material,
          imageUrl,
        };
      }),
    );
  },
});

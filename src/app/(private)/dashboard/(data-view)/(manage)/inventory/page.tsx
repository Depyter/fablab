import { preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { InventoryClient } from "./_client";

export default async function InventoryPage() {
  const preloadedResources = await preloadAuthQuery(
    api.resource.query.getResources,
  );
  const preloadedMaterials = await preloadAuthQuery(
    api.materials.query.getMaterials,
  );

  return (
    <InventoryClient
      preloadedResources={preloadedResources}
      preloadedMaterials={preloadedMaterials}
    />
  );
}

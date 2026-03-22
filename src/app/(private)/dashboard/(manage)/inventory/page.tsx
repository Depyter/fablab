import { preloadQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { InventoryClient } from "./_client";

export default async function InventoryPage() {
  const preloadedResources = await preloadQuery(
    api.resource.query.getResources,
  );

  return <InventoryClient preloadedResources={preloadedResources} />;
}

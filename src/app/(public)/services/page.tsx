import { preloadQuery } from "convex/nextjs";
import { api } from "@/../convex/_generated/api";
import { ServicesListClient } from "./_client";

export default async function ServicesPage() {
  const preloadedServices = await preloadQuery(api.services.query.getServices);
  return <ServicesListClient preloadedServices={preloadedServices} />;
}

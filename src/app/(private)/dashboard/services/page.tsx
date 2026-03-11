import { preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@/../convex/_generated/api";
import { ServicesListClient } from "./_client";

export default async function ServicesPage() {
  const preloadedServices = await preloadAuthQuery(
    api.services.query.getServices,
  );
  return <ServicesListClient preloadedServices={preloadedServices} />;
}

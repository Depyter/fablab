import { fetchQuery } from "convex/nextjs";
import { api } from "@/../convex/_generated/api";
import { ServicesListClient } from "./_client";

export const revalidate = 60; // revalidate every minute for better freshness
export const dynamic = "force-static";

export default async function ServicesPage() {
  const services = await fetchQuery(api.services.query.getServices);
  return <ServicesListClient services={services} />;
}

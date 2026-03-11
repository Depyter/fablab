import { preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { notFound } from "next/navigation";
import { preloadedQueryResult } from "convex/nextjs";
import { ServiceDetailClient } from "./_client";

export default async function ServiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const preloadedService = await preloadAuthQuery(
    api.services.query.getService,
    { service: id as Id<"services"> },
  );

  const service = preloadedQueryResult(preloadedService);
  if (service === null) {
    notFound();
  }

  return <ServiceDetailClient preloadedService={preloadedService} />;
}

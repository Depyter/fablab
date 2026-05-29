import { preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@/../convex/_generated/api";
import { notFound } from "next/navigation";
import { preloadedQueryResult } from "convex/nextjs";
import { ServiceDetailClient } from "./_client";

export default async function ServiceDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const preloadedService = await preloadAuthQuery(
    api.services.query.getService,
    { slug: slug },
  );

  const service = preloadedQueryResult(preloadedService);
  if (service === null) {
    notFound();
  }

  return <ServiceDetailClient preloadedService={preloadedService} />;
}

import { preloadQuery } from "convex/nextjs";
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

  const preloadedService = await preloadQuery(api.services.query.getService, {
    slug: slug,
  });

  // Peek at the result server-side so we can 404 immediately
  // instead of shipping a loading skeleton that resolves to "not found"
  const service = preloadedQueryResult(preloadedService);
  if (service === null) {
    notFound();
  }

  return <ServiceDetailClient preloadedService={preloadedService} />;
}

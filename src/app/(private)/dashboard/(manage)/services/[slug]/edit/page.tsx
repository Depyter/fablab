import { preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@/../convex/_generated/api";
import { notFound } from "next/navigation";
import { preloadedQueryResult } from "convex/nextjs";
import { EditServiceClient } from "./_client";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const preloadedService = await preloadAuthQuery(
    api.services.query.getService,
    { slug },
  );

  const service = preloadedQueryResult(preloadedService);
  if (service === null) {
    notFound();
  }

  return <EditServiceClient preloadedService={preloadedService} />;
}

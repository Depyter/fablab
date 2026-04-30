import { fetchQuery } from "convex/nextjs";
import { api } from "@/../convex/_generated/api";
import { notFound } from "next/navigation";
import { ServiceDetailClient } from "./_client";

export const revalidate = 60; // revalidate every minute
export const dynamic = "force-static";

export async function generateStaticParams() {
  const services = await fetchQuery(api.services.query.getServices);
  return services.map((service) => ({
    slug: service.slug,
  }));
}

export default async function ServiceDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const service = await fetchQuery(api.services.query.getService, {
    slug: slug,
  });

  if (service === null) {
    notFound();
  }

  return <ServiceDetailClient service={service} />;
}

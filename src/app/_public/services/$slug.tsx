import { api } from "@convex/_generated/api";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ArrowLeft, CirclePercent } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef } from "react";
import { BookingDialog } from "@/components/booking/dialog-form";
import type { WorkshopSchedule } from "@/components/booking/workshop-time-slot-picker";
import { ServiceGallery } from "@/components/services/image-carousel";

export const Route = createFileRoute("/_public/services/$slug")({
  component: RouteComponent,
  loader: async (opts) => {
    const slug = opts.params.slug;

    const service = await opts.context.queryClient.fetchQuery(
      convexQuery(api.services.query.getService, { slug }),
    );

    if (service?.serviceCategory.type === "WORKSHOP" && service._id) {
      opts.context.queryClient.prefetchQuery(
        convexQuery(api.workshopSessions.query.listByService, {
          serviceId: service._id,
        }),
      );
    }
  },
});

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function RouteComponent() {
  const { slug } = Route.useParams();
  const { data: service } = useQuery(
    convexQuery(api.services.query.getService, { slug }),
  );
  const tealStickerRef = useRef<HTMLDivElement | null>(null);
  const magentaStickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!service) return;

    posthog.capture("service_detail_viewed", {
      service_id: service._id,
      service_name: service.name,
      service_type: service.serviceCategory.type,
    });
  }, [service]);

  useEffect(() => {
    const stickers = [tealStickerRef.current, magentaStickerRef.current].filter(
      (sticker): sticker is HTMLDivElement => sticker !== null,
    );

    if (stickers.length === 0) return;

    const animations = stickers.map((sticker, index) =>
      gsap.to(sticker, {
        rotation: index === 0 ? 360 : -360,
        duration: index === 0 ? 10 : 12,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      }),
    );

    return () => {
      animations.forEach((animation) => {
        animation.kill();
      });
    };
  }, []);

  const workshopServiceId =
    service?.serviceCategory.type === "WORKSHOP" ? service._id : undefined;

  const { data: workshopSessions } = useQuery({
    ...convexQuery(api.workshopSessions.query.listByService, {
      // biome-ignore  lint/style/noNonNullAssertion: Ensured to exist due to enabled param
      serviceId: workshopServiceId!,
    }),
    enabled: workshopServiceId !== undefined,
  });

  const groupedSchedules = useMemo((): Array<WorkshopSchedule> | undefined => {
    if (!workshopSessions) return undefined;
    if (workshopSessions.length === 0) return [];

    const dateMap = new Map<number, WorkshopSchedule>();

    for (const session of workshopSessions) {
      const existing = dateMap.get(session.date);
      if (existing) {
        existing.timeSlots.push({
          startTime: session.startTime,
          endTime: session.endTime,
          maxSlots: session.maxSlots,
          usedUpSlots: session.usedUpSlots,
        });
        continue;
      }

      dateMap.set(session.date, {
        date: session.date,
        timeSlots: [
          {
            startTime: session.startTime,
            endTime: session.endTime,
            maxSlots: session.maxSlots,
            usedUpSlots: session.usedUpSlots,
          },
        ],
      });
    }

    return Array.from(dateMap.values())
      .sort((a, b) => a.date - b.date)
      .map((schedule) => ({
        ...schedule,
        timeSlots: [...schedule.timeSlots].sort(
          (a, b) => a.startTime - b.startTime,
        ),
      }));
  }, [workshopSessions]);

  if (service === undefined) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-25" />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-24">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-foreground/50">
            Loading service...
          </p>
        </div>
      </main>
    );
  }

  if (service === null) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-25" />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-foreground/50">
            Service Not Found
          </p>
          <h1 className="mt-6 text-4xl font-black uppercase tracking-tighter sm:text-6xl">
            This service doesn&apos;t exist.
          </h1>
          <Link
            to="/services"
            className="mt-8 inline-flex items-center border-2 border-black bg-fab-amber px-6 py-3 text-xs font-black uppercase tracking-[0.25em] text-black shadow-[4px_4px_0_0_#000] transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            Back to Services
          </Link>
        </div>
      </main>
    );
  }

  const sortedFabricationDays =
    service.serviceCategory.type === "FABRICATION"
      ? [...(service.serviceCategory.availableDays ?? [])].sort((a, b) => a - b)
      : [];
  const fabricationDays = sortedFabricationDays.map(
    (day) => DAY_NAMES[day] ?? "Unknown",
  );
  const hasVariants = (service.serviceCategory.variants?.length ?? 0) > 0;
  const fabricationUnitName =
    service.serviceCategory.type === "FABRICATION"
      ? service.serviceCategory.unitName
      : null;
  const basePrice =
    service.serviceCategory.type === "WORKSHOP"
      ? service.serviceCategory.amount
      : service.serviceCategory.setupFee;
  const regularRate =
    service.serviceCategory.type === "WORKSHOP"
      ? service.serviceCategory.amount
      : service.serviceCategory.timeRate;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background font-sans">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-25" />
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-fab-magenta/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-fab-teal/10 blur-3xl" />

      <section className="relative z-10 border-b-8 border-black bg-fab-amber/20">
        <div className="container mx-auto grid max-w-7xl lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <div className="relative min-h-120 overflow-visible border-b-8 border-black px-6 py-6 sm:px-8 sm:py-8 lg:min-h-152 lg:border-b-0 lg:px-10 lg:py-10">
            <Link
              to="/services"
              aria-label="Back to services"
              className="absolute left-6 top-6 z-30 inline-flex h-10 w-10 items-center justify-center border-2 border-black bg-fab-amber text-black shadow-[4px_4px_0_0_#000] transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 sm:left-8 sm:top-8"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            </Link>

            <div className="relative px-0 sm:mt-8 lg:mt-8">
              <div className="pointer-events-none relative h-[min(82vw,40rem)] w-full max-w-160 sm:h-[min(72vw,42rem)] lg:h-[min(52vw,38rem)] lg:max-w-176 lg:rotate-[-5deg] lg:pl-0">
                <div
                  ref={tealStickerRef}
                  className="absolute left-4 top-4 z-20 hidden h-16 w-16 rounded-full border-2 border-black bg-fab-teal shadow-[4px_4px_0_0_#000] sm:left-5 sm:top-5 sm:h-20 sm:w-20 lg:left-6 lg:top-6 lg:block"
                >
                  <div className="relative h-full w-full p-3 sm:p-4">
                    <img
                      src="/fablab.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                <div
                  ref={magentaStickerRef}
                  className="absolute bottom-4 right-4 z-20 hidden h-16 w-16 rounded-full border-2 border-black bg-fab-magenta shadow-[4px_4px_0_0_#000] sm:bottom-5 sm:right-5 sm:h-20 sm:w-20 lg:bottom-6 lg:right-6 lg:block"
                >
                  <div className="relative h-full w-full p-3 sm:p-4">
                    <img
                      src="/fablab.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full rotate-12 object-contain"
                    />
                  </div>
                </div>

                <ServiceGallery images={service.imageUrls} />
              </div>
            </div>
          </div>

          <div className="mt-0 flex flex-col gap-4 p-6 sm:p-8 lg:mt-20 lg:p-10">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center border border-black bg-fab-teal px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-white">
                  {service.status}
                </span>
                <span className="inline-flex items-center border border-black bg-background px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/70">
                  {service.serviceCategory.type}
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-black uppercase tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
                  {service.name}
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {service.description}
                </p>
              </div>

              {fabricationDays.length > 0 && (
                <div>
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-foreground/50">
                    Available Days
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {fabricationDays.map((day) => (
                      <span
                        key={day}
                        className="inline-flex items-center border border-black bg-background px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-foreground/70"
                      >
                        {day.slice(0, 3).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {service.serviceCategory.type === "WORKSHOP" &&
                groupedSchedules &&
                groupedSchedules.length > 0 && (
                  <div>
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-foreground/50">
                      Available Sessions
                    </p>
                    <div className="space-y-3">
                      {groupedSchedules.map((schedule) => (
                        <div
                          key={schedule.date}
                          className="border-2 border-black bg-background p-4"
                        >
                          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-foreground/70">
                            {new Date(schedule.date).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {schedule.timeSlots.map((slot) => (
                              <div
                                key={`${schedule.date}-${slot.startTime}-${slot.endTime}`}
                                className="inline-flex flex-col gap-1 border border-black bg-sidebar-accent/30 px-3 py-2 text-[10px]"
                              >
                                <span className="font-bold uppercase tracking-widest">
                                  {new Date(slot.startTime).toLocaleTimeString(
                                    "en-US",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      timeZone: "Asia/Manila",
                                    },
                                  )}{" "}
                                  -{" "}
                                  {new Date(slot.endTime).toLocaleTimeString(
                                    "en-US",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      timeZone: "Asia/Manila",
                                    },
                                  )}
                                </span>
                                <span className="text-foreground/50">
                                  {slot.maxSlots} slot
                                  {slot.maxSlots !== 1 ? "s" : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border-2 border-black bg-background p-4 sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/50">
                    Base Price
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    P{basePrice.toLocaleString()}
                  </p>

                  {service.serviceCategory.type === "WORKSHOP" &&
                  hasVariants ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {service.serviceCategory.variants?.map((variant) => (
                        <span
                          key={variant.name}
                          className="inline-flex items-center gap-1 border border-black/10 bg-sidebar-accent/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
                        >
                          <CirclePercent className="h-3 w-3" />
                          {variant.name}: P{variant.amount.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {service.serviceCategory.type === "FABRICATION" &&
                  hasVariants ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {service.serviceCategory.variants?.map((variant) => (
                        <span
                          key={variant.name}
                          className="inline-flex items-center gap-1 border border-black/10 bg-sidebar-accent/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
                        >
                          <CirclePercent className="h-3 w-3" />
                          {variant.name}: P{variant.setupFee.toLocaleString()}{" "}
                          base
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="border-2 border-black bg-background p-4 sm:p-5 sm:text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/50">
                    Rate Per {fabricationUnitName ?? "Session"}
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    P{regularRate.toLocaleString()}
                  </p>

                  {service.serviceCategory.type === "FABRICATION" &&
                  hasVariants ? (
                    <div className="mt-4 flex flex-wrap gap-2 sm:justify-end">
                      {service.serviceCategory.variants?.map((variant) => (
                        <span
                          key={variant.name}
                          className="inline-flex items-center gap-1 border border-black/10 bg-sidebar-accent/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
                        >
                          <CirclePercent className="h-3 w-3" />
                          {variant.name}: P{variant.timeRate.toLocaleString()}/
                          {fabricationUnitName}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <BookingDialog
                serviceId={service._id}
                serviceName={service.name}
                requirements={service.requirements}
                fileTypes={service.fileTypes ?? []}
                availableDays={
                  service.serviceCategory.type === "FABRICATION"
                    ? sortedFabricationDays
                    : []
                }
                serviceMaterials={service.materialDetails ?? []}
                hasUpPricing={
                  (service.serviceCategory.variants?.length ?? 0) > 0
                }
                pricingVariants={service.serviceCategory.variants ?? []}
                servicePricing={
                  service.serviceCategory.type === "WORKSHOP"
                    ? {
                        type: "WORKSHOP",
                        amount: service.serviceCategory.amount,
                        variants: service.serviceCategory.variants,
                      }
                    : {
                        type: "FABRICATION",
                        setupFee: service.serviceCategory.setupFee,
                        unitName: service.serviceCategory.unitName,
                        timeRate: service.serviceCategory.timeRate,
                        variants: service.serviceCategory.variants,
                      }
                }
                serviceCategory={service.serviceCategory.type}
                schedules={groupedSchedules}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-b-8 border-black bg-fab-teal/10">
        <div className="border-b-8 border-black bg-fab-magenta px-6 py-8 text-white">
          <div className="container mx-auto max-w-7xl">
            <p className="text-3xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">
              Technical Requirements
            </p>
          </div>
        </div>
        <div className="container mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-12">
            <div className="border-2 border-black bg-background p-6 sm:p-8">
              {service.requirements.length > 0 ? (
                <ul className="space-y-4">
                  {service.requirements.map((req, index) => {
                    const duplicateCount = service.requirements
                      .slice(0, index)
                      .filter((item) => item === req).length;

                    return (
                      <li
                        key={`${req}-${duplicateCount}`}
                        className="flex items-center gap-4 border-b border-black/10 pb-4 last:border-0 last:pb-0"
                      >
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center border border-black bg-fab-amber text-[10px] font-black uppercase tracking-[0.2em] text-black">
                          0{index + 1}
                        </span>
                        <span className="text-sm leading-relaxed text-foreground/80">
                          {req}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No standard requirements.
                </p>
              )}
            </div>

            <div className="border-2 border-black bg-background p-6 sm:p-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-foreground/50">
                Need assistance?
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Our lab experts are available to guide you through the
                fabrication process. Contact us for custom consultations.
              </p>
              <div className="mt-8 h-1 w-12 bg-fab-magenta" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-b-8 border-black bg-background">
        <div className="border-b-8 border-black bg-fab-amber px-6 py-8">
          <div className="container mx-auto max-w-7xl text-start">
            <p className="text-3xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">
              Project Samples
            </p>
          </div>
        </div>
        <div className="container mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5">
            {service.sampleUrls.map((url, index) => (
              <div
                key={url}
                className="relative aspect-square overflow-hidden border border-black bg-sidebar-accent/10"
              >
                <img
                  src={url}
                  alt={`Sample project ${index + 1}`}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
            ))}

            {service.sampleUrls.length === 0 && (
              <div className="col-span-full border border-dashed border-black/20 bg-sidebar-accent/5 py-20 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                  Gallery coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MOCK_SERVICES } from "@/lib/mock-data";
import { CirclePercent, PhilippinePeso, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceTile } from "@/components/services/price-tile";
import Link from "next/link";
import { ServiceGallery } from "@/components/services/image-carousel";
import Image from "next/image";

export default function ServiceDetailsPage() {
  const params = useParams();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // If user scrolls down more than 10px, show the line
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Look up the service by ID
  const service = MOCK_SERVICES.find((s) => s.id === params.id);

  if (!service)
    return <div className="p-20 text-center">Service not found</div>;

  return (
    <main className="">
      <div className="container mx-auto max-w-6xl p-10">
        {/* Top Navigation & Actions */}
        <header
          className={`sticky top-0 z-10 flex items-center justify-between mb-8 bg-white pb-4 ${isScrolled ? "border-b border-gray-200" : "border-b-0"}`}
        >
          <div className="flex items-center gap-4">
            <Link href="/services">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-gray-200 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {service.title}
            </h1>
          </div>
          {/* <div className="flex gap-3">
            <Button variant="outline" className="bg-[#F1F1F1] text-gray-600 hover:bg-gray-200 px-6 font-medium rounded-lg">
              Remove
            </Button>
            <Button className="bg-[#1A8A7E] hover:bg-[#156E65] px-10 font-medium rounded-lg">
              Edit
            </Button>
          </div> */}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Gallery */}
          <div className="lg:col-span-5 space-y-4">
            <ServiceGallery images={service.images} />
          </div>

          {/* Right Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex gap-4">
              <PriceTile
                label="Regular Price"
                price={service.regularPrice}
                unit={service.unit}
                icon={
                  <div className="border-gray-200 rounded-full border-2 w-6 h-6 items-center p-0.5 justify-center align-middle">
                    {" "}
                    <PhilippinePeso className="h-4 w-4 text-gray-200 stroke-2.5" />{" "}
                  </div>
                }
              />
              <PriceTile
                label="UP Rate"
                price={service.discountedPrice}
                unit={service.unit}
                icon={<CirclePercent className="h-6 w-6 text-gray-200" />}
              />
            </div>

            <div className="border border-gray-200 rounded-xl p-8 relative min-h-125">
              <div className="absolute top-6 right-8 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  Status
                </span>
                <Badge className="bg-[#F4FBF9] text-chart-6 border-none px-4 py-1 font-semibold">
                  {service.status}
                </Badge>
              </div>

              <section className="mb-10">
                <h3 className="text-lg font-bold mb-3">Description</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
                  {service.description}
                </p>
              </section>

              <section className="mb-10">
                <h3 className="text-lg font-bold mb-3">Requirements</h3>
                <ul className="list-disc list-inside text-gray-500 text-sm space-y-2">
                  {service.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">Machines</h3>
                <div className="text-gray-500 text-sm space-y-1">
                  {service.machines.map((m, i) => (
                    <p key={i}>{m}</p>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8 bg-light-yellow p-10">
        <h2 className="text-xl font-bold mb-4">Projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {service.projects.map((project, index) => (
            <div key={index} className="p-1 aspect-square">
              <Image
                src={project}
                alt={""}
                className="w-full h-full object-cover rounded-lg"
                width={500}
                height={500}
              />
            </div>
          ))}

          {service.projects.length === 0 && (
            <div className="col-span-full border-dashed border-gray-300 text-center py-10">
              <p className="text-gray-400">
                No projects available for this service.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GeneralInfoForm } from "../../../../../components/services/forms/general-info-form";
import { PricingForm } from "@/components/services/forms/pricing-form";
import { RequirementsForm } from "@/components/services/forms/requirements-form";
import { SampleProjectsForm } from "@/components/services/forms/upload-sample-proj-form";
import { ThumbnailForm } from "@/components/services/forms/upload-thumbnail-form";
import { MachineSelectForm } from "@/components/services/forms/machine-select-form";
import { SelectForm } from "@/components/services/forms/select-form";

export interface AddServiceFromValues {
  title: string;
  description: string;
  regularPrice: number;
  discountedPrice: number;
  unit: string;
  status: string;
  images: string[];
  machines: number[];
  requirements: string[];
  projects: string[];
}

export default function AddServicePage() {
  const [isScrolled, setIsScrolled] = useState(false);

  // sample select machine options
  const machineOptions = [
    { label: "Machine 1", value: "machine-1" },
    { label: "Machine 2", value: "machine-2" },
    { label: "Machine 3", value: "machine-3" },
  ];

  // sample select status options
  const statusOptions = [
    { label: "Available", value: "available" },
    { label: "Unavailable", value: "unavailable" },
    { label: "Maintenance", value: "maintenance" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      // If user scrolls down more than 10px, show the line
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  //   // Look up the service by ID
  //   const service = MOCK_SERVICES.find((s) => s.id === params.id);

  //   if (!service) return <div className="p-20 text-center">Service not found</div>;

  return (
    <main className="container mx-auto max-w-6xl p-10">
    
     
        {/* Top Navigation & Actions */}
        <header
          className={`sticky top-0 z-10 flex items-center justify-between mb-8 bg-white pb-4 ${isScrolled ? "border-b border-gray-200" : "border-b-0"}`}
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard/services">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-gray-200 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Add New Service</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="bg-[#F1F1F1] text-gray-600 hover:bg-gray-200 px-6 font-medium rounded-lg"
            >
              Discard
            </Button>
            <Button
              className="bg-[#1A8A7E] hover:bg-[#156E65] px-10 font-medium rounded-lg"
              onClick={() => {}}
            >
              Add Service
            </Button>
          </div>
        </header>
        <form >
          <div className="grid grid-cols-1 lg:grid-cols-8 gap-8">
            {/* Left Content */}
            <div className="lg:col-span-5 space-y-5">
              <GeneralInfoForm />
              <PricingForm />
              <RequirementsForm  />
              <SampleProjectsForm />
            </div>

            {/* Right Content */}
            <div className="lg:col-span-3 space-y-4">
              <ThumbnailForm />
              <MachineSelectForm options={machineOptions} />
              <SelectForm
              
                title="Status"
                options={statusOptions}
    
              />
            </div>
          </div>
      
      </form>
    </main>
  );
}

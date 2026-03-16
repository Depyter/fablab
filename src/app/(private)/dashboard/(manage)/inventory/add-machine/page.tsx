"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/file-upload";

export default function AddMachinePage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // In a real app, you would gather FormData here
    console.log("Mock Saving Service...");
    
    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    router.push("/dashboard/services");
  };

  return (
    <main className="container mx-auto max-w-6xl p-10">
      <form onSubmit={handleSubmit}>
        {/* Top Navigation & Actions */}
        <header
          className={`sticky top-0 z-10 flex items-center justify-between mb-8 bg-white pb-4 ${
            isScrolled ? "border-b border-gray-200" : "border-b-0"
          }`}
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard/services">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 border-gray-200 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Add New Service</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="bg-[#F1F1F1] text-gray-600 hover:bg-gray-200 px-6 font-medium rounded-lg"
              onClick={() => router.push("/dashboard/services")}
            >
              Discard
            </Button>
            <Button
              type="submit"
              className="bg-[#1A8A7E] hover:bg-[#156E65] px-10 font-medium rounded-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Add Service"}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-8 gap-8">
          {/* Left Content */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <FieldSet>
                <FieldLegend>General Information</FieldLegend>
                <FieldDescription>
                  Provide the basic details about this service.
                </FieldDescription>
                <FieldGroup className="mt-4">
                  <Field>
                    <FieldLabel htmlFor="service-name">Service Name</FieldLabel>
                    <Input id="service-name" placeholder="e.g. 3D Printing" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="service-description">Description</FieldLabel>
                    <Textarea 
                      id="service-description" 
                      placeholder="Describe the service..."
                      className="resize-none min-h-[120px]"
                      required
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>

            
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3 space-y-5">
            <div className="mt-4">
              <FileUpload
                title="Thumbnail"
                accept="image/png, image/jpeg, image/jpg"
                onFilesChange={() => {}}
              />
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <FieldSet>
                <FieldLegend>Status</FieldLegend>
                <FieldGroup className="mt-4">
                  <Field>
                    <Select defaultValue="Available">
                      <SelectTrigger id="service-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="Unavailable">Unavailable</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
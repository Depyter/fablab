"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface ServiceGalleryProps {
  images: string[];
}

export function ServiceGallery({ images }: ServiceGalleryProps) {
  const [mainApi, setMainApi] = React.useState<CarouselApi>();
  const [thumbApi, setThumbApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  // Sync Thumbnails when Main Carousel moves
  React.useEffect(() => {
    if (!mainApi || !thumbApi) return;

    const onSelect = () => {
      const selectedIndex = mainApi.selectedScrollSnap();
      setCurrent(selectedIndex);
      thumbApi.scrollTo(selectedIndex); // Moves the thumbnail track
    };

    mainApi.on("select", onSelect);
    return () => {
      mainApi.off("select", onSelect);
    };
  }, [mainApi, thumbApi]);

  return (
    <div className="space-y-6">
      {/* Main Large Carousel */}
      <Carousel setApi={setMainApi} className="w-full">
        <CarouselContent>
          {images.map((src, index) => (
            <CarouselItem key={index}>
              <Card className="border-none shadow-none">
                <CardContent className="flex aspect-[4/3] items-center justify-center p-0 overflow-hidden rounded-2xl border">
                  <img src={src} className="w-full h-full object-cover" alt="" />
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 bg-white/80 border border-chart-4 hover:bg-white rounded-sm" />
        <CarouselNext className="right-2 bg-white/80 border border-chart-4 hover:bg-white rounded-sm" />
      </Carousel>

      {/* Sliding Thumbnail Track */}
      <Carousel 
        setApi={setThumbApi} 
        opts={{ containScroll: "keepSnaps", dragFree: true }} 
        className="w-full "
      >
        <CarouselContent className="-ml-3">
          {images.map((src, index) => (
            <CarouselItem key={index} className="pl-3 basis-1/2 lg:basis-1/3"> 
              <button
                onClick={() => mainApi?.scrollTo(index)}
                className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                  current === index 
                    ? "border-[#1A8A7E] ring-2 ring-[#1A8A7E]/20 opacity-100" 
                    : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                <img src={src} className="w-full h-full object-cover" alt="" />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
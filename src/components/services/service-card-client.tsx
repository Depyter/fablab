import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface ServiceCardProps {
  id: string; // Unique identifier for the service
  imageSrc: string;
  title: string;
  imageAlt?: string;
  buttonText?: string;
}

export function ServiceCardClient({
  id,
  imageSrc,
  title,
  imageAlt = "Service image",
  buttonText = "View Service",

}: ServiceCardProps) {
  return (
    <Card className={`group relative overflow-hidden border-none bg-color p-1 transition-all hover:shadow-md`}>

      {/* Image Container with title */}
      <div className="relative mb-8 aspect-[3/3.5] w-full overflow-hidden rounded-lg flex items-center justify-center">
        <div className="flex flex-col gap-10 items-center">
          <img
          src={imageSrc}
          alt={imageAlt}
          className="h-full w-full rounded-lg object-contain transition-transform duration-500 group-hover:scale-105"
          />
          <h3 className="text-md font-bold tracking-[0.2em] text-gray-400 uppercase">
            {title}
          </h3>
        
        </div>
        {/* on card hover */}
        <div className="absolute inset-0 flex items-end justify-center pb-6 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-4">
          <Link href={`/services/${id}`} className="w-full px-4">
            <Button className="w-full bg-primary text-white hover:bg-primary-muted hover:text-chart-2 rounded-full shadow-sm font-semibold">
              {buttonText}
            </Button>
          </Link>
        </div>
      </div>

      
    </Card>
  );
}
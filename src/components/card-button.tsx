"use client";

import { Card } from "@/components/ui/card";
import { CirclePlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface CardButtonProps {
  path : string;
}

export function CardButton({path}: CardButtonProps) {
  const router = useRouter();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => router.push(path)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(path);
        }
      }}
      className="relative mx-auto w-full max-w-sm cursor-pointer border-2 border-dashed border-primary bg-transparent transition-all duration-200 hover:bg-primary/5 hover:border-primary/80 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[420px] flex flex-col items-center justify-center gap-3 select-none group"
    >
      <CirclePlus className="size-10 text-primary transition-transform duration-200 group-hover:scale-110" />
      <div className="flex flex-col items-center gap-1 text-center px-6">
        <p className="text-lg font-semibold text-primary">Add New Service</p>
        <p className="text-sm text-muted-foreground">
          Click to add a new service to the catalogue
        </p>
      </div>
    </Card>
  );
}

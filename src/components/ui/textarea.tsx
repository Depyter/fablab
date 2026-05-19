import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-2 border-black bg-white placeholder:text-muted-foreground resize-none rounded-none px-3 py-3 text-base shadow-none transition-all duration-200 ease-out focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 md:text-sm flex field-sizing-content min-h-16 w-full disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

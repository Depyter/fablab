import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "rounded-none transition-all inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden group/badge",
  {
    variants: {
      variant: {
        default:
          "rounded-none border-2 border-black bg-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1",
        secondary:
          "rounded-none border-2 border-black bg-fab-teal/20 text-fab-teal",
        destructive:
          "rounded-none border-2 border-black bg-red-100 text-red-800",
        outline:
          "rounded-none border-2 border-black border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground bg-input/30",
        ghost:
          "rounded-none hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

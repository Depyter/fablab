import { ChevronRight } from "lucide-react";

export function PublicNavItemContent({ label }: { label: string }) {
  return (
    <>
      <span className="text-3xl font-black uppercase tracking-tighter leading-none text-inherit sm:text-xl">
        {label}
      </span>
      <div className="flex items-center sm:hidden">
        <ChevronRight
          className="size-8 transition-transform duration-150 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-2"
          strokeWidth={6}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <ChevronRight
          className="-ml-5 size-8 opacity-60 transition-transform duration-150 delay-75 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-2"
          strokeWidth={6}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </div>
    </>
  );
}

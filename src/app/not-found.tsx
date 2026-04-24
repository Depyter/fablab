import { CtaButton } from "@/components/cta-button";

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col items-center justify-center p-12">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-[size:120px_120px] opacity-35" />
      <h1 className="relative z-10 text-6xl font-black uppercase tracking-tighter sm:text-8xl">
        404 - Page Not Found
      </h1>
      <p className="relative z-10 mt-6 text-2xl font-bold uppercase tracking-tighter">
        The page you&#39;re looking for doesn&#39;t exist.
      </p>
      <CtaButton
        href="/"
        label="Home"
        className="h-8 mt-8 shrink-0 p-5 sm:p-7 lg:p-9"
      />
    </div>
  );
}

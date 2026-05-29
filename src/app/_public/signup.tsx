import { createFileRoute } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { SignUpForm } from "@/components/signup-form";

export const Route = createFileRoute("/_public/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid min-h-svh lg:grid-cols-3">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignUpForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block col-span-2">
        <Image
          src="/fablab_mural.png"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover object-right dark:brightness-[0.2] dark:grayscale"
          width={500}
          height={500}
        />
      </div>
    </div>
  );
}

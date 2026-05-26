import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/signup-form";
import Image from "next/image";
import { LoginRedirect } from "@/components/login-redirect";

/**
 * The sign-up page is only available in preview and local dev environments.
 * In production, email/password auth is disabled server-side, so this page
 * would show a broken form. We redirect to login instead.
 *
 * This check mirrors isPreviewEnvironment() in convex/auth.ts.
 */
export default function SignUpPage() {
  const env = process.env.NEXTJS_ENV;
  const isPreview = env === "preview" || env === "development";

  if (!isPreview) {
    redirect("/login");
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-3">
      <LoginRedirect />
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

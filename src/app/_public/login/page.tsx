import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import Image from "next/image";
import { LoginRedirect } from "@/components/login-redirect";

/**
 * In preview and local dev environments, email/password auth replaces OAuth.
 * Redirect to the signup page which handles both sign-up and sign-in.
 * Production continues to use the Google OAuth flow.
 */
export default function LoginPage() {
  const env = process.env.NEXTJS_ENV;
  const isPreview = env === "preview" || env === "development";

  if (isPreview) {
    redirect("/signup");
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-3">
      <LoginRedirect />
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
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

import { redirect } from "next/navigation";
import { BannedUserDialog } from "@/components/ban-error-dialog";

interface ErrorPageProps {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const { error, error_description } = await searchParams;

  if (error !== "banned") {
    redirect("/login");
  }

  return (
    <div className="min-h-svh flex items-center justify-center">
      <BannedUserDialog message={error_description} />
    </div>
  );
}

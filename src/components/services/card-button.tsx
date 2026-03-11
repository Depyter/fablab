import { Card } from "@/components/ui/card";

import { CirclePlus } from "lucide-react";
import { useRouter } from "next/navigation";

export function CardButton() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/dashboard/services/add-service");
  };

  return (
    <Card
      className="bg-transparent relative mx-auto w-full max-w-sm pt-0 border border-primary border-2 hover:bg-primary-muted items-center justify-center"
      onClick={handleClick}
    >
      <div className="flex flex-col items-center justify-center p-4">
        <CirclePlus className="size-12 text-primary" />
        <p className="mt-2 text-lg font-semibold text-primary">
          Add New Service
        </p>
      </div>
    </Card>
  );
}

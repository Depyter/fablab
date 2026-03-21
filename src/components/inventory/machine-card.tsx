import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { stat } from "fs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MachineDetails } from "@/components/inventory/machine-details";

interface MachineCardProps {
  // required
  //   slug: string;
  //   imageSrc: string;

  machineName: string;
  specifications: string;
  status: string;
  serviceName: string;

  buttonText?: string;
  showBadge?: boolean;
  badgeVariant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "ghost"
    | "link";
  className?: string;
}

export function MachineCard({
  //   slug,
  //   imageSrc,
  machineName,
  specifications,

  status,
  buttonText = "View Details",
  showBadge = true,
  badgeVariant = status === "completed"
    ? "outline"
    : status === "active"
      ? "secondary"
      : "destructive",

  className = "",
}: MachineCardProps) {
  return (
    <Card className={`relative mx-auto w-full max-w-sm pt-5 ${className}`}>
      <CardAction
        className={"absolute inset-0 z-40 p-4 flex items-start justify-end"}
      >
        {showBadge && (
          <Badge variant={badgeVariant} className="h-8 rounded-lg h-8">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )}
      </CardAction>
      <CardHeader>
        <CardTitle className="font-bold text-xl">{machineName}</CardTitle>
        <CardDescription>{specifications}</CardDescription>
      </CardHeader>

      <div className="flex-1/2" />
      <CardFooter>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="rounded-full px-10 bg-primary hover:bg-primary/80 hover:text-white text-white w-full"
            >
              View Details
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm lg:max-w-3xl rounded-xl p-10">
            <MachineDetails />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

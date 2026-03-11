import { ReactNode } from "react";
import { Card, CardContent } from "../ui/card";
import { PhilippinePeso } from "lucide-react";

interface PriceTileProps {
  label: string;
  price: number;
  unit: string;
  icon: ReactNode;
}

export function PriceTile({ label, price, unit, icon }: PriceTileProps) {
  return (
    <Card className="bg-transparent border border-gray-200 items-center border-0 rounded-xl">
      <CardContent className="flex flex-col gap-3 items-start">
        <div className="flex flex-row items-center justify-center align-middle gap-2 text-gray-400 text-[11px] uppercase tracking-wider">
          {icon}
          {label}
        </div>
        <div className="text-lg font-bold flex flex-row">
          {" "}
          <PhilippinePeso /> {price.toFixed(2)}/{unit}
        </div>
      </CardContent>
    </Card>
  );
}

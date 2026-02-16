import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { CirclePlus } from "lucide-react"



export function CardButton() {
  return (
    <Card className="bg-transparent relative mx-auto w-full max-w-sm pt-0 border border-primary border-2 hover:bg-primary-muted items-center justify-center" onClick={() => alert("Card button clicked!")}>
      <div className="flex flex-col items-center justify-center p-4">
        <CirclePlus className="size-12 text-primary" />
        <p className="mt-2 text-lg font-semibold text-primary">Add New Service</p>
      </div>
    </Card>
  )
}

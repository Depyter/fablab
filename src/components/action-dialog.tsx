import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface ActionDialogProps {
  onConfirm: () => void;
  title: string;
  description: string;
  baseActionText?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  className?: string;
  disabled?: boolean;
}

export function ActionDialog({
  onConfirm,
  title,
  description,
  baseActionText,
  confirmButtonText,
  cancelButtonText,
  className,
  disabled,
}: ActionDialogProps) {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className={cn("rounded-lg", className)}
            disabled={disabled}
          >
            {baseActionText || "Back"}
          </Button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-sm rounded-xl"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <FieldGroup></FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-lg">
                {cancelButtonText || "Go Back"}
              </Button>
            </DialogClose>
            <Button type="submit" onClick={onConfirm} className="rounded-lg">
              {confirmButtonText || "Cancel Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

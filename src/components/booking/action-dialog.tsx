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

interface ActionDialogProps {
  onConfirm: () => void;
}

export function ActionDialog({ onConfirm }: ActionDialogProps) {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button variant="outline" className="rounded-lg">
            Back
          </Button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-sm rounded-xl"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Cancel Project Request?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this request?
            </DialogDescription>
          </DialogHeader>
          <FieldGroup></FieldGroup>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline" className="rounded-lg">
                Go Back
              </Button>
            </DialogClose>
            <Button type="submit" onClick={onConfirm} className="rounded-lg">
              Cancel Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

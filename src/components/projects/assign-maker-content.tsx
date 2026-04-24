import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { OptionRadioGroup, OptionRadioGroupItem } from "../option-radio-group";

interface AssignMakerContentProps {
  projectName: string;
  selectedMaker: string;
  makerOptions: OptionRadioGroupItem[];
  onSelectMaker: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function AssignMakerContent({
  projectName,
  selectedMaker,
  makerOptions,
  onSelectMaker,
  onBack,
  onConfirm,
}: AssignMakerContentProps) {
  return (
    <div className="space-y-5">
      <DialogHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="px-2" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project Details
          </Button>
        </div>
        <DialogTitle className="text-xl">Assign Maker</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Select a maker for {projectName}.
        </p>
      </DialogHeader>

      <OptionRadioGroup
        value={selectedMaker}
        onValueChange={onSelectMaker}
        options={makerOptions}
        className="max-w-full"
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!selectedMaker}>
          Confirm Assignment
        </Button>
      </div>
    </div>
  );
}

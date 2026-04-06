import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Card, CardContent } from "@/components/ui/card";

import { ChevronLeft } from "lucide-react";

import { Field, FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "../ui/textarea";
import { FileUpload } from "../file-upload";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ActionDialog } from "../action-dialog";
import { toast } from "sonner";
import { useAppForm } from "@/lib/form-context";
import { UploadedFile } from "../file-upload/types";
import { useMutation } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

interface BookingDialog {
  projectId: Id<"projects">;
}

export function BookingDialog({ projectId }: BookingDialog) {
  const router = useRouter();

  const projects = useQuery(api.projects.query.getProject, {
    projectId: projectId,
  });

  if (!projects) {
    return null;
  }

  


  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="px-10 font-medium rounded-md text-white hover:text-white w-full"
        >
          View Details
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl sm:max-h-2xl rounded-xl">


      </DialogContent>
    </Dialog>
  );
}

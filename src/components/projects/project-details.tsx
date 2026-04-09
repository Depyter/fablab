"use client";
import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { STATUS_STYLES } from "./project-card";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { OptionRadioGroupItem } from "../option-radio-group";
import { AssignMakerContent } from "./assign-maker-content";
import { ProjectDetailsContent } from "./project-details-content";

interface ProjectDetailsProps {
  projectId: Id<"projects">;
  bookingDate?: number;
  bookingTime?: number;
  serviceName?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
  buttonLabel?: string;
}

export function ProjectDetails({
  projectId,
  bookingDate,
  bookingTime,
  trigger,
  triggerClassName,
  buttonLabel = "View Details",
}: ProjectDetailsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<"details" | "assign-maker">(
    "details",
  );
  const [selectedMaker, setSelectedMaker] = useState("");

  const project = useQuery(api.projects.query.getProject, {
    projectId,
  });

  const updateProject = useMutation(api.projects.mutate.updateProject);

  const handleUpdateStatus = async (
    newStatus: "pending" | "approved" | "rejected" | "completed",
  ) => {
    try {
      await updateProject({ projectId, status: newStatus });
      toast.success(`Project ${newStatus} successfully!`);
    } catch {
      toast.error(`Failed to update project to ${newStatus}`);
    }
  };

  const styles = project
    ? (STATUS_STYLES[project.status] ?? STATUS_STYLES.pending)
    : STATUS_STYLES.pending;

  const timelineSteps = project
    ? [
        {
          title: "Request submitted",
          statusLabel: "Completed",
          byLabel: project.client?.name ?? "Client",
          completed: true,
        },
        {
          title: "Admin review",
          statusLabel:
            project.status === "rejected"
              ? "Rejected"
              : project.status === "pending"
                ? "Pending"
                : "Completed",
          byLabel: project.status === "pending" ? "Waiting" : "Admin",
          active: project.status === "pending",
          completed:
            project.status === "approved" || project.status === "completed",
          rejected: project.status === "rejected",
        },
        {
          title: "Maker assignment",
          statusLabel:
            project.status === "rejected"
              ? "Cancelled"
              : project.status === "approved"
                ? "Completed"
                : project.status === "completed"
                  ? "Completed"
                  : "Pending",
          byLabel: project.status === "approved" ? "Assigned" : "Waiting",
          active: project.status === "approved",
          completed: project.status === "completed",
        },
        {
          title: "Project execution",
          statusLabel:
            project.status === "rejected"
              ? "Cancelled"
              : project.status === "completed"
                ? "Completed"
                : "Pending",
          byLabel: project.status === "completed" ? "Finished" : "Waiting",
          active: project.status === "completed",
          completed: project.status === "completed",
        },
      ]
    : [];

  const makerOptions: OptionRadioGroupItem[] = [
    {
      value: "maker-1",
      id: "maker-1",
      title: "Maker A",
      status: "available",
      activeProjectsAssigned: 1,
     
    },
    {
      value: "maker-2",
      id: "maker-2",
      title: "Maker B",
      status: "busy",
      activeProjectsAssigned: 3,
      disabled: false,
      nextAvailable: "2026-04-10",
    },
    {
      value: "maker-3",
      id: "maker-3",
      title: "Maker C",
      status: "busy",
      activeProjectsAssigned: 0,
      disabled: true,
      nextAvailable: "2026-05-01",
    },
  ];

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setDialogView("details");
      setSelectedMaker("");
    }
  };

  const handleOpenAssignView = () => {
    setDialogView("assign-maker");
  };

  const handleBackToDetails = () => {
    setDialogView("details");
  };

  const handleAssignMaker = () => {
    if (!selectedMaker) {
      toast.error("Please choose a maker first.");
      return;
    }

    const chosenMaker =
      makerOptions.find((maker) => maker.value === selectedMaker)?.title ??
      "Selected maker";
    toast.success(`${chosenMaker} selected. Backend hookup will be added next.`);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" className={cn("w-full", triggerClassName)}>
            {buttonLabel}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[92vh] sm:max-w-6xl overflow-x-hidden overflow-y-auto rounded-xl p-4 sm:p-6">
        {!project ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading project details...
          </div>
        ) : dialogView === "assign-maker" ? (
          <AssignMakerContent
            projectName={project.name}
            selectedMaker={selectedMaker}
            makerOptions={makerOptions}
            onSelectMaker={setSelectedMaker}
            onBack={handleBackToDetails}
            onConfirm={handleAssignMaker}
          />
        ) : (
          <ProjectDetailsContent
            project={project}
            bookingDate={bookingDate}
            bookingTime={bookingTime}
            styles={styles}
            timelineSteps={timelineSteps}
            onOpenAssignView={handleOpenAssignView}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

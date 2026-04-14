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
  const cancelOwnProject = useMutation(api.projects.mutate.cancelOwnProject);
  const role = useQuery(api.users.getRole, {});
  const isClient = role === "client";

  const handleUpdateStatus = async (
    newStatus:
      | "pending"
      | "approved"
      | "rejected"
      | "completed"
      | "cancelled"
      | string,
  ) => {
    try {
      await updateProject({
        projectId,
        status: newStatus as
          | "pending"
          | "approved"
          | "rejected"
          | "completed"
          | "cancelled",
      });
      toast.success(`Project status updated to ${newStatus}!`);
    } catch {
      toast.error(`Failed to update project status`);
    }
  };

  const handleCancelProject = async () => {
    try {
      await cancelOwnProject({ projectId });
      toast.success("Project request cancelled.");
    } catch {
      toast.error("Failed to cancel project request.");
    }
  };

  let styles = project
    ? (STATUS_STYLES[project.status] ?? STATUS_STYLES.pending)
    : STATUS_STYLES.pending;

  if (project?.status === "cancelled") {
    styles = {
      badge: "bg-red-100 text-red-700 border-red-200",
      cover: "from-red-500/20 to-red-500/5",
    };
  }

  const makers = useQuery(api.users.getMakers);

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
              : project.status === "cancelled"
                ? "Cancelled"
                : project.status === "pending"
                  ? "Pending"
                  : "Completed",
          byLabel: project.status === "pending" ? "Waiting" : "Admin",
          active: project.status === "pending",
          completed:
            project.status === "approved" || project.status === "completed",
          rejected:
            project.status === "rejected" || project.status === "cancelled",
        },
        {
          title: "Maker assignment",
          statusLabel:
            project.status === "rejected" || project.status === "cancelled"
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
            project.status === "rejected" || project.status === "cancelled"
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

  const makerOptions: OptionRadioGroupItem[] = makers
    ? makers.map((m) => ({
        value: m._id,
        id: m._id,
        title: m.name,
        status: "available",
        activeProjectsAssigned: 0,
      }))
    : [];

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

  const handleAssignMaker = async () => {
    if (!selectedMaker) {
      toast.error("Please choose a maker first.");
      return;
    }

    try {
      await updateProject({
        projectId,
        status: "approved",
        makerId: selectedMaker as Id<"userProfile">,
      });
      toast.success("Project approved and maker assigned!");
      setDialogView("details");
    } catch {
      toast.error("Failed to assign maker.");
    }
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
            isClient={isClient}
            onCancelProject={handleCancelProject}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

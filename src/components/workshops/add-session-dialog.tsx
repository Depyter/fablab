"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InlineResourceSelect,
  InlineMaterialSelect,
} from "@/components/services/forms/inline-resource-material-select";
import { toast } from "sonner";
import {
  getLabDayStartTimestamp,
  getLabTimeTimestamp,
  parseLabDayKey,
} from "@/lib/lab-time";

type AddSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedServiceId?: string;
};

export function AddSessionDialog({
  open,
  onOpenChange,
  preselectedServiceId,
}: AddSessionDialogProps) {
  const services = useQuery(api.services.query.getServices);
  const createSession = useMutation(api.workshopSessions.mutate.create);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workshopServices = React.useMemo(
    () => services?.filter((s) => s.serviceCategory.type === "WORKSHOP") ?? [],
    [services],
  );

  const [serviceId, setServiceId] = useState(preselectedServiceId ?? "");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxSlots, setMaxSlots] = useState("10");
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  const reset = () => {
    setServiceId(preselectedServiceId ?? "");
    setDate("");
    setStartTime("");
    setEndTime("");
    setMaxSlots("10");
    setSelectedResources([]);
    setSelectedMaterials([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !date || !startTime || !endTime || !maxSlots) {
      toast.error("Please fill in all fields");
      return;
    }

    const parsedDay = parseLabDayKey(date);
    if (!parsedDay) {
      toast.error("Invalid date");
      return;
    }
    const dateTimestamp = getLabDayStartTimestamp(parsedDay);
    const startTimestamp = getLabTimeTimestamp(parsedDay, startTime);
    const endTimestamp = getLabTimeTimestamp(parsedDay, endTime);

    if (startTimestamp >= endTimestamp) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSubmitting(true);
    try {
      await createSession({
        serviceId: serviceId as Id<"services">,
        date: dateTimestamp,
        startTime: startTimestamp,
        endTime: endTimestamp,
        maxSlots: parseInt(maxSlots, 10),
        ...(selectedResources.length > 0
          ? { resources: selectedResources as Id<"resources">[] }
          : {}),
        ...(selectedMaterials.length > 0
          ? { availableMaterials: selectedMaterials as Id<"materials">[] }
          : {}),
      });
      toast.success("Session created!");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create session",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const servicesLoading = services === undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Session</DialogTitle>
          <DialogDescription>
            Schedule a new workshop session. Date and times are in Asia/Manila
            timezone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Workshop select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
              Workshop
            </label>
            <Select
              value={serviceId}
              onValueChange={setServiceId}
              disabled={servicesLoading}
            >
              <SelectTrigger className="h-10 w-full border-2 border-black text-sm font-bold shadow-[2px_2px_0_0_#000]">
                <SelectValue
                  placeholder={
                    servicesLoading
                      ? "Loading workshops..."
                      : "Select a workshop…"
                  }
                />
              </SelectTrigger>
              <SelectContent className="border-2 border-black shadow-[3px_3px_0_0_#000]">
                {workshopServices.map((s) => (
                  <SelectItem key={s._id} value={s._id} className="font-bold">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-10 text-sm font-bold"
            />
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Start Time
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="h-10 text-sm font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                End Time
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="h-10 text-sm font-bold"
              />
            </div>
          </div>

          {/* Max slots */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
              Max Slots
            </label>
            <Input
              type="number"
              min="1"
              max="999"
              value={maxSlots}
              onChange={(e) => setMaxSlots(e.target.value)}
              required
              className="h-10 text-sm font-bold"
            />
          </div>

          {/* Override resources */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Override Resources
              </span>
              <span className="ml-1 text-[9px] font-medium text-black/40">
                (optional — defaults from workshop)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InlineResourceSelect
                title="Room / Resource"
                placeholder="Select resources…"
                value={selectedResources}
                onChange={setSelectedResources}
              />
              <InlineMaterialSelect
                title="Materials"
                placeholder="Select materials…"
                value={selectedMaterials}
                onChange={setSelectedMaterials}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 border-2 border-black bg-white px-4 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 border-2 border-black bg-fab-teal px-4 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0_0_#000]"
            >
              {isSubmitting ? "Creating…" : "Create Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

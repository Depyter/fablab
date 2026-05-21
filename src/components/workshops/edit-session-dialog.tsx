"use client";

import * as React from "react";
import { useState } from "react";
import { useMutation } from "convex/react";
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
  InlineResourceSelect,
  InlineMaterialSelect,
} from "@/components/services/forms/inline-resource-material-select";
import { toast } from "sonner";
import {
  getLabDayStartTimestamp,
  getLabTimeTimestamp,
  getLabDayKey,
  parseLabDayKey,
} from "@/lib/lab-time";

type EditSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    _id: string;
    serviceId: string;
    date: number;
    startTime: number;
    endTime: number;
    maxSlots: number;
    usedUpSlots: number;
    resources?: string[];
    availableMaterials?: string[];
  };
};

export function EditSessionDialog({
  open,
  onOpenChange,
  session,
}: EditSessionDialogProps) {
  const updateAndNotify = useMutation(
    api.workshopSessions.mutate.updateAndNotify,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert timestamps to input-friendly values (in lab timezone)
  const toDateInput = (ts: number) => getLabDayKey(ts);
  const toTimeInput = (ts: number) =>
    new Date(ts).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
    });

  const [date, setDate] = useState(toDateInput(session.date));
  const [startTime, setStartTime] = useState(toTimeInput(session.startTime));
  const [endTime, setEndTime] = useState(toTimeInput(session.endTime));
  const [maxSlots, setMaxSlots] = useState(String(session.maxSlots));
  const [selectedResources, setSelectedResources] = useState<string[]>(
    session.resources ?? [],
  );
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(
    session.availableMaterials ?? [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime || !maxSlots) {
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

    const slotsNum = parseInt(maxSlots, 10);
    if (slotsNum < session.usedUpSlots) {
      toast.error(
        `Cannot reduce capacity below ${session.usedUpSlots} (already booked)`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAndNotify({
        sessionId: session._id as Id<"workshopSessions">,
        date: dateTimestamp,
        startTime: startTimestamp,
        endTime: endTimestamp,
        maxSlots: slotsNum,
        ...(selectedResources.length > 0
          ? { resources: selectedResources as Id<"resources">[] }
          : {}),
        ...(selectedMaterials.length > 0
          ? { availableMaterials: selectedMaterials as Id<"materials">[] }
          : {}),
      });
      toast.success("Session updated!");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update session",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Session</DialogTitle>
          <DialogDescription>
            Update session details. Attendees will be notified of schedule
            changes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
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
              min={session.usedUpSlots}
              max="999"
              value={maxSlots}
              onChange={(e) => setMaxSlots(e.target.value)}
              required
              className="h-10 text-sm font-bold"
            />
            <p className="text-[9px] text-black/40">
              {session.usedUpSlots} slot{session.usedUpSlots !== 1 ? "s" : ""}{" "}
              already booked — minimum is {session.usedUpSlots}
            </p>
          </div>

          {/* Resources & Materials */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Resources &amp; Materials
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
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

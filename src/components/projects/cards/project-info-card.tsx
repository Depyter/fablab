"use client";

import { FulfillmentModeType, ProjectMaterialType } from "@convex/constants";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailCard } from "./detail-card";
import { ProjectAttachments } from "@/components/projects/project-attachments";
import { FileUpload } from "@/components/file-upload/file-upload";
import { UploadedFile } from "@/components/file-upload/types";

interface ResolvedFile {
  url?: string | null;
  type: string | null;
  originalName?: string | null;
}

interface ProjectInfoCardProps {
  description?: string | null;
  serviceType: FulfillmentModeType;
  material: string;
  notes?: string | null;
  bookingDateStr: string;
  bookingTimeRange: string;
  resolvedFiles?: ResolvedFile[] | null;
  submittedBy?: string | null;
  submittedAt?: number | null;

  // Edit controls
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;

  // Edit field values + setters
  editDescription: string;
  setEditDescription: (v: string) => void;
  editNotes: string;
  setEditNotes: (v: string) => void;
  editFiles: UploadedFile[];
  setEditFiles: (files: UploadedFile[]) => void;
  editMaterial: ProjectMaterialType;
  setEditMaterial: (v: ProjectMaterialType) => void;
  editServiceType: FulfillmentModeType;
  setEditServiceType: (v: FulfillmentModeType) => void;

  hideServiceType?: boolean;
  workshop?: boolean;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeeStatus?: string;
}

export function ProjectInfoCard({
  description,
  serviceType,
  material,
  notes,
  bookingDateStr,
  bookingTimeRange,
  resolvedFiles,
  submittedBy,
  submittedAt,
  canEdit,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  editDescription,
  setEditDescription,
  editNotes,
  setEditNotes,
  editFiles,
  setEditFiles,
  editMaterial,
  setEditMaterial,
  editServiceType,
  setEditServiceType,
  hideServiceType = false,
  workshop = false,
  attendeeName,
  attendeeEmail,
  attendeeStatus,
}: ProjectInfoCardProps) {
  return (
    <DetailCard
      title={workshop ? "Attendee" : "Project Details"}
      onEdit={canEdit ? onEdit : undefined}
      isEditing={isEditing}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      bodyClassName="space-y-4"
    >
      {/* Attendee info (workshop only) */}
      {workshop && attendeeName && (
        <>
          <div className="grid min-w-0 grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Attendee
              </p>
              <p className="text-sm font-bold text-black">{attendeeName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Status
              </p>
              <p className="text-sm font-black uppercase tracking-tighter text-black">
                {attendeeStatus}
              </p>
            </div>
          </div>
          <div className="h-px bg-black" />
        </>
      )}

      {workshop && attendeeEmail && (
        <>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
              Email
            </p>
            <p className="text-sm font-bold text-black break-all">
              {attendeeEmail}
            </p>
          </div>
          <div className="h-px bg-black" />
        </>
      )}

      {/* Description */}
      {!workshop && (
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
            Description
          </p>
          {isEditing ? (
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="text-sm"
              placeholder="Project description…"
            />
          ) : (
            <p className="break-words whitespace-pre-line text-sm font-bold text-black">
              {description}
            </p>
          )}
        </div>
      )}

      {!workshop && <div className="h-px bg-black" />}

      {/* Service type + material */}
      {!workshop && (
        <>
          <div
            className={cn(
              "grid min-w-0 gap-4",
              hideServiceType ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {!hideServiceType && (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                  Service Type
                </p>
                {isEditing ? (
                  <Select
                    value={editServiceType}
                    onValueChange={(v) =>
                      setEditServiceType(v as FulfillmentModeType)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self-service">Self Service</SelectItem>
                      <SelectItem value="full-service">Full Service</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-bold text-black capitalize">
                    {serviceType}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Material
              </p>
              {isEditing ? (
                <Select
                  value={editMaterial}
                  onValueChange={(v) =>
                    setEditMaterial(v as "provide-own" | "buy-from-lab")
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="provide-own">Provide Own</SelectItem>
                    <SelectItem value="buy-from-lab">Buy from Lab</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-bold text-black capitalize">
                  {material}
                </p>
              )}
            </div>
          </div>

          <div className="h-px bg-black" />
        </>
      )}

      {/* Attachments */}
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
          Attachments
        </p>
        {isEditing ? (
          <FileUpload
            value={editFiles}
            onFilesChange={setEditFiles}
            variant="minimal"
            title="Add files"
            multiple
          />
        ) : (
          <ProjectAttachments
            files={(resolvedFiles ?? [])
              .filter((f) => !!f.url)
              .map((f) => ({
                url: f.url!,
                type: f.type,
                originalName: f.originalName,
              }))}
          />
        )}
      </div>

      {/* Booking date + time — hidden for workshops */}
      {!workshop && (
        <>
          <div className="h-px bg-black" />

          <div className="grid min-w-0 grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Booking Date
              </p>
              <p className="text-sm font-bold text-black">{bookingDateStr}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Time Range
              </p>
              <p className="text-sm font-bold text-black">{bookingTimeRange}</p>
            </div>
          </div>
        </>
      )}

      {/* Notes — hidden for workshops */}
      {!workshop && (
        <>
          <div className="h-px bg-black" />

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
              Notes
            </p>
            {isEditing ? (
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="text-sm"
                placeholder="Additional notes…"
              />
            ) : (
              <p className="text-sm font-bold text-black/60">
                {notes || "No notes provided"}
              </p>
            )}
          </div>
        </>
      )}

      <div className="h-px bg-black" />

      {/* Submitted by / at */}
      <div className="grid min-w-0 grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
            Submitted By
          </p>
          <p className="text-sm font-bold text-black">{submittedBy ?? "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
            Submitted On
          </p>
          <p className="text-sm font-bold text-black">
            {submittedAt
              ? new Date(submittedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"}
          </p>
        </div>
      </div>
    </DetailCard>
  );
}

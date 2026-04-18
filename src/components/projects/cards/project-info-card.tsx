"use client";

import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailCard } from "./detail-card";

interface ProjectInfoCardProps {
  description?: string | null;
  serviceType: string;
  material: string;
  notes?: string | null;
  bookingDateStr: string;
  bookingTimeRange: string;

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
  editMaterial: "provide-own" | "buy-from-lab";
  setEditMaterial: (v: "provide-own" | "buy-from-lab") => void;
  editServiceType: "self-service" | "full-service" | "workshop";
  setEditServiceType: (v: "self-service" | "full-service" | "workshop") => void;
}

export function ProjectInfoCard({
  description,
  serviceType,
  material,
  notes,
  bookingDateStr,
  bookingTimeRange,
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
  editMaterial,
  setEditMaterial,
  editServiceType,
  setEditServiceType,
}: ProjectInfoCardProps) {
  return (
    <DetailCard
      title="Project Details"
      onEdit={canEdit ? onEdit : undefined}
      isEditing={isEditing}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      bodyClassName="space-y-4"
    >
      {/* Description */}
      <div className="space-y-1">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--fab-text-dim)" }}
        >
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
          <p
            className="wrap-break-word whitespace-pre-line text-sm"
            style={{ color: "var(--fab-text-primary)" }}
          >
            {description}
          </p>
        )}
      </div>

      <div className="h-px" style={{ background: "var(--fab-border-soft)" }} />

      {/* Service type + material */}
      <div className="grid min-w-0 grid-cols-2 gap-4">
        <div className="space-y-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--fab-text-dim)" }}
          >
            Service Type
          </p>
          {isEditing ? (
            <Select
              value={editServiceType}
              onValueChange={(v) =>
                setEditServiceType(
                  v as "self-service" | "full-service" | "workshop",
                )
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self-service">Self Service</SelectItem>
                <SelectItem value="full-service">Full Service</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p
              className="text-sm capitalize"
              style={{ color: "var(--fab-text-primary)" }}
            >
              {serviceType}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--fab-text-dim)" }}
          >
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
            <p
              className="text-sm capitalize"
              style={{ color: "var(--fab-text-primary)" }}
            >
              {material}
            </p>
          )}
        </div>
      </div>

      {/* Booking date + time */}
      <div className="grid min-w-0 grid-cols-2 gap-4">
        <div className="space-y-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--fab-text-dim)" }}
          >
            Booking Date
          </p>
          <p className="text-sm" style={{ color: "var(--fab-text-primary)" }}>
            {bookingDateStr}
          </p>
        </div>
        <div className="space-y-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--fab-text-dim)" }}
          >
            Time Range
          </p>
          <p className="text-sm" style={{ color: "var(--fab-text-primary)" }}>
            {bookingTimeRange}
          </p>
        </div>
      </div>

      <div className="h-px" style={{ background: "var(--fab-border-soft)" }} />

      {/* Notes */}
      <div className="space-y-1">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--fab-text-dim)" }}
        >
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
          <p
            className="text-sm"
            style={{
              color: notes ? "var(--fab-text-muted)" : "var(--fab-text-dim)",
            }}
          >
            {notes || "No notes provided"}
          </p>
        )}
      </div>
    </DetailCard>
  );
}

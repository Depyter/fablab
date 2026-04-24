"use client";

import { ProjectAttachments } from "@/components/projects/project-attachments";
import { FileUpload } from "@/components/file-upload/file-upload";
import { UploadedFile } from "@/components/file-upload/types";
import { DetailCard } from "./detail-card";

interface ResolvedFile {
  url?: string | null;
  type: string | null;
  originalName?: string | null;
}

interface AttachmentsCardProps {
  resolvedFiles?: ResolvedFile[] | null;

  // Edit controls
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;

  // Edit field values
  editFiles: UploadedFile[];
  setEditFiles: (files: UploadedFile[]) => void;
}

export function AttachmentsCard({
  resolvedFiles,
  canEdit,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  editFiles,
  setEditFiles,
}: AttachmentsCardProps) {
  const fileCount = (resolvedFiles ?? []).filter((f) => !!f.url).length;

  return (
    <DetailCard
      title="Attachments"
      headerRight={
        fileCount > 0 ? (
          <span
            className="text-[10px]"
            style={{ color: "var(--fab-text-dim)" }}
          >
            {fileCount}
          </span>
        ) : undefined
      }
      onEdit={canEdit ? onEdit : undefined}
      isEditing={isEditing}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      bodyClassName="py-3"
    >
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
    </DetailCard>
  );
}

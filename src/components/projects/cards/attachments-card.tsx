import { toast } from "sonner";
import { FileUpload } from "@/components/file-upload/file-upload";
import type { UploadedFile } from "@/components/file-upload/types";
import { ProjectAttachments } from "@/components/projects/project-attachments";
import { DetailCard } from "./detail-card";

interface ResolvedFile {
  url?: string | null;
  type: string | null;
  originalName?: string | null;
}

interface AttachmentsCardProps {
  resolvedFiles?: Array<ResolvedFile> | null;

  // Edit controls
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;

  // Edit field values
  editFiles: Array<UploadedFile>;
  setEditFiles: (files: Array<UploadedFile>) => void;
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
          onUploadError={(error) => {
            toast.error(error.message || "Failed to upload file");
          }}
          variant="minimal"
          title="Add files"
          multiple
        />
      ) : (
        <ProjectAttachments
          files={(resolvedFiles ?? []).flatMap((file) =>
            file.url
              ? [
                  {
                    url: file.url,
                    type: file.type,
                    originalName: file.originalName,
                  },
                ]
              : [],
          )}
        />
      )}
    </DetailCard>
  );
}

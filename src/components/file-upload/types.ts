export interface UploadedFile {
  storageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  url?: string;
  /** Moderation status — set by the file-upload hook when polling the backend. */
  moderationStatus?: "clean" | "flagged";
  /** Human-readable comma-separated list of violated categories. */
  moderationCategory?: string;
}

export interface UploadingFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  storageId?: string;
}

export interface FileUploadProps {
  title: string;
  onAddFile?: (file: UploadedFile) => void | Promise<void>;
  onUploadComplete?: (file: UploadedFile) => void | Promise<void>;
  onUploadError?: (error: Error, file: File) => void;
  onFilesChange?: (files: UploadedFile[]) => void;
  onRemoveFile?: (file: UploadedFile) => void | Promise<void>;
  /** Called whenever the in-progress upload state changes. `true` means at least one upload is still pending/uploading. */
  onUploadingChange?: (isUploading: boolean) => void;
  /** Called whenever the list of in-progress uploading files changes, so consumers can render progress indicators. */
  onUploadingFilesChange?: (files: UploadingFile[]) => void;
  maxFiles?: number;
  maxFileSizeMB?: number;
  accept?: string;
  allowedTypes?: string[];
  disabled?: boolean;
  className?: string;
  multiple?: boolean;
  variant?: "default" | "compact" | "minimal" | "inline";
  showPreview?: boolean;
  autoUpload?: boolean;
  value?: UploadedFile[];
  showDriveLinkNote?: boolean;
}

export interface ModelUploadProps {
  onUploadComplete?: (file: UploadedFile) => void | Promise<void>;
  onUploadError?: (error: Error, file: File) => void;
  onFileChange?: (file: UploadedFile | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  maxFileSizeMB?: number;
  disabled?: boolean;
  className?: string;
  value?: UploadedFile | null;
}

export interface UploadedFile {
  storageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  url?: string;
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
  onAddFile?: (file: UploadedFile) => void;
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: Error, file: File) => void;
  onFilesChange?: (files: UploadedFile[]) => void;
  onRemoveFile?: (file: UploadedFile) => void;
  /** Called whenever the in-progress upload state changes. `true` means at least one upload is still pending/uploading. */
  onUploadingChange?: (isUploading: boolean) => void;
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
}

export interface ModelUploadProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: Error, file: File) => void;
  onFileChange?: (file: UploadedFile | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  maxFileSizeMB?: number;
  disabled?: boolean;
  className?: string;
  value?: UploadedFile | null;
}

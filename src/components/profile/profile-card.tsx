"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { User, Camera, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function UserProfileDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const profile = useQuery(api.users.getUserProfile);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const trackUpload = useMutation(api.files.trackUpload);

  const [name, setName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (!nextOpen) {
        return;
      }

      setName(profile?.name ?? "");
      setPendingFile(null);
      setPendingPreviewUrl((currentPreviewUrl) => {
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
        }
        return null;
      });
    },
    [profile?.name],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast.error("Image must be less than 1 MB");
      return;
    }

    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      let storageId: string | undefined;

      if (pendingFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": pendingFile.type },
          body: pendingFile,
        });
        if (!result.ok) throw new Error("Upload failed");
        const { storageId: sid } = await result.json();
        await trackUpload({
          originalName: pendingFile.name,
          type: pendingFile.type,
          upload: sid,
        });
        storageId = sid;
      }

      await updateProfile({
        name: name.trim(),
        ...(storageId ? { profilePic: storageId as Id<"_storage"> } : {}),
      });

      toast.success("Profile updated");
      setOpen(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const previewSrc = pendingPreviewUrl ?? profile?.profilePicUrl ?? null;
  const hasChanges = name !== (profile?.name ?? "") || pendingFile !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-md bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 pt-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 rounded-full bg-muted/50 border border-border/40 flex items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-7 w-7 text-muted-foreground/40" />
                )}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full shadow pointer-events-none"
                tabIndex={-1}
                aria-hidden
              >
                <Camera className="h-3 w-3" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Profile Photo
              </span>
              <span className="text-xs text-muted-foreground/60">
                JPG, PNG or GIF · max 1 MB
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary hover:underline text-left mt-0.5"
              >
                {pendingFile ? pendingFile.name : "Upload photo"}
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="profile-name"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Display Name
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !isSaving && hasChanges && handleSave()
              }
              placeholder="Your name"
              className="h-9 bg-muted/40 shadow-none border-border/40"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSaving}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

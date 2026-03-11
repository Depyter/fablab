"use client";

import { withForm } from "@/lib/form-context";
import { addServiceFormOpts } from "@/types/add-service";
import { FileUpload } from "@/components/file-upload";

export const ThumbnailForm = withForm({
  ...addServiceFormOpts,
  render: function ThumbnailRender({ form }) {
    return (
      <form.Field
        name="images"
        children={(field) => (
          <FileUpload
            title="Thumbnail"
            accept="image/png, image/jpeg, image/jpg"
            maxFiles={1}
            onFilesChange={(files) =>
              field.handleChange(files.map((f) => f.storageId))
            }
          />
        )}
      />
    );
  },
});

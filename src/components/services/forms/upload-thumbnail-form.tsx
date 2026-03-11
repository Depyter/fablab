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
        validators={{
          onSubmit: ({ value }) =>
            value.length === 0
              ? "At least one thumbnail is required"
              : undefined,
        }}
        children={(field) => (
          <div>
            <FileUpload
              title="Thumbnail"
              accept="image/png, image/jpeg, image/jpg"
              maxFiles={1}
              onFilesChange={(files) =>
                field.handleChange(files.map((f) => f.storageId))
              }
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-red-500 mt-1">
                {field.state.meta.errors[0]?.toString()}
              </p>
            )}
          </div>
        )}
      />
    );
  },
});

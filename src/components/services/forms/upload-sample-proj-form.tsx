"use client";

import { withForm } from "@/lib/form-context";
import { addServiceFormOpts } from "@/types/add-service";
import { FileUpload } from "@/components/file-upload";

export const SampleProjectsForm = withForm({
  ...addServiceFormOpts,
  render: function SampleProjectsRender({ form }) {
    return (
      <form.Field
        name="samples"
        children={(field) => (
          <FileUpload
            title="Sample Projects"
            accept="image/png, image/jpeg, image/jpg"
            onFilesChange={(files) =>
              field.handleChange(files.map((f) => f.storageId))
            }
          />
        )}
      />
    );
  },
});

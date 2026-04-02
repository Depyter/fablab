import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextInput: (props: {
      label: string;
      placeholder?: string;
      required?: boolean;
    }) => {
      const field = useFieldContext<string>();
      return (
        <Field>
          <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel>
          <Input
            id={field.name}
            placeholder={props.placeholder}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            required={props.required}
          />
          {field.state.meta.errors?.length > 0 && (
            <FieldError
              errors={field.state.meta.errors.map((err) => ({
                message: err?.toString() ?? "Invalid value",
              }))}
            />
          )}
        </Field>
      );
    },
    TextareaInput: (props: {
      label: string;
      placeholder?: string;
      required?: boolean;
      rows?: number;
      className?: string;
    }) => {
      const field = useFieldContext<string>();
      return (
        <Field>
          <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel>
          <Textarea
            id={field.name}
            placeholder={props.placeholder}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            required={props.required}
            rows={props.rows}
            className={props.className}
          />
          {field.state.meta.errors?.length > 0 && (
            <FieldError
              errors={field.state.meta.errors.map((err) => ({
                message: err?.toString() ?? "Invalid value",
              }))}
            />
          )}
        </Field>
      );
    },
  },
  formComponents: {},
});

import {
  createFormHook,
  createFormHookContexts,
  type AppFieldExtendedReactFormApi,
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
} from "@tanstack/react-form";
import {
  WorkshopTimeSlotPicker,
  type WorkshopTimeSlotValue,
  type WorkshopSchedule,
} from "@/components/booking/workshop-time-slot-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

const fieldComponents = {
  RequiredLabel: ({
    label,
    required,
  }: {
    label: string;
    required?: boolean;
  }) => (
    <>
      {label}
      {required ? (
        <>
          <span aria-hidden="true" className="ml-1 text-fab-magenta">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      ) : null}
    </>
  ),
  TextInput: (props: {
    label: string;
    placeholder?: string;
    required?: boolean;
  }) => {
    const field = useFieldContext<string>();
    return (
      <Field>
        <FieldLabel htmlFor={field.name}>
          <fieldComponents.RequiredLabel
            label={props.label}
            required={props.required}
          />
        </FieldLabel>
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
        <FieldLabel htmlFor={field.name}>
          <fieldComponents.RequiredLabel
            label={props.label}
            required={props.required}
          />
        </FieldLabel>
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
  NumberInput: (props: {
    label: string;
    placeholder?: string;
    required?: boolean;
    min?: number;
    max?: number;
    step?: number;
  }) => {
    const field = useFieldContext<number>();
    return (
      <Field>
        <FieldLabel htmlFor={field.name}>
          <fieldComponents.RequiredLabel
            label={props.label}
            required={props.required}
          />
        </FieldLabel>
        <Input
          id={field.name}
          type="number"
          placeholder={props.placeholder}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(Number(e.target.value))}
          required={props.required}
          min={props.min}
          max={props.max}
          step={props.step}
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
  WorkshopTimeSlotPicker: (props: { schedules?: WorkshopSchedule[] }) => {
    const field = useFieldContext<WorkshopTimeSlotValue>();
    return (
      <>
        <WorkshopTimeSlotPicker
          value={field.state.value}
          onChange={field.handleChange}
          schedules={props.schedules}
        />
        {field.state.meta.errors?.length > 0 && (
          <FieldError
            errors={field.state.meta.errors.map((err) => ({
              message: err?.toString() ?? "Invalid value",
            }))}
          />
        )}
      </>
    );
  },
  SelectInput: (props: {
    label: string;
    placeholder?: string;
    options: { label: string; value: string }[];
    required?: boolean;
  }) => {
    const field = useFieldContext<string>();
    return (
      <Field>
        <FieldLabel htmlFor={field.name}>
          <fieldComponents.RequiredLabel
            label={props.label}
            required={props.required}
          />
        </FieldLabel>
        <Select
          value={field.state.value}
          onValueChange={(val) => field.handleChange(val)}
        >
          <SelectTrigger id={field.name}>
            <SelectValue placeholder={props.placeholder || "Select..."} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {props.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
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
};

const formComponents = {};

type AppFormValidate<TFormData> = FormValidateOrFn<TFormData> | undefined;
type AppFormAsyncValidate<TFormData> =
  | FormAsyncValidateOrFn<TFormData>
  | undefined;

export type AppFormApi<TFormData> = AppFieldExtendedReactFormApi<
  TFormData,
  AppFormValidate<TFormData>,
  AppFormValidate<TFormData>,
  AppFormAsyncValidate<TFormData>,
  AppFormValidate<TFormData>,
  AppFormAsyncValidate<TFormData>,
  AppFormValidate<TFormData>,
  AppFormAsyncValidate<TFormData>,
  AppFormValidate<TFormData>,
  AppFormAsyncValidate<TFormData>,
  AppFormAsyncValidate<TFormData>,
  unknown,
  typeof fieldComponents,
  typeof formComponents
>;

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents,
  formComponents,
});

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface OptionRadioGroupItem {
  value: string;
  title: string;
  description?: string;
  status?: "available" | "busy" | "offline";
  activeProjectsAssigned?: number;
  id: string;
  disabled?: boolean;
  nextAvailable?: string; // ISO date string for when the maker will be available again
}

interface OptionRadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: OptionRadioGroupItem[];
  className?: string;
}

export function OptionRadioGroup({
  value,
  onValueChange,
  options,
  className,
}: OptionRadioGroupProps) {
  const getStatusBadgeClassName = (status?: OptionRadioGroupItem["status"]) => {
    if (status === "available") {
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    }
    if (status === "busy") {
      return "border-amber-200 bg-amber-100 text-amber-700";
    }
    if (status === "offline") {
      return "border-muted-foreground/20 bg-muted text-muted-foreground";
    }
    return "border-muted-foreground/20 bg-muted text-muted-foreground";
  };

  const getStatusLabel = (status?: OptionRadioGroupItem["status"]) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      {options.map((option) => (
        <FieldLabel
          key={option.value}
          htmlFor={option.id}
          className={
            option.disabled ? "cursor-not-allowed opacity-50" : undefined
          }
        >
          <Field orientation="horizontal">
            <FieldContent>
              <div className="flex flex-wrap items-center gap-2">
                <FieldTitle>{option.title}</FieldTitle>
                {option.status && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClassName(option.status)}`}
                  >
                    {getStatusLabel(option.status)}
                  </span>
                )}
              </div>
              {option.description && (
                <FieldDescription>{option.description}</FieldDescription>
              )}
              {(option.status ||
                option.activeProjectsAssigned !== undefined ||
                option.nextAvailable !== undefined) && (
                <FieldDescription>
                  <span className="flex flex-col items-start gap-2">
                    <span className="text-xs">
                      Active Projects: {option.activeProjectsAssigned ?? 0}
                    </span>
                    {option.nextAvailable !== undefined && (
                      <span className="text-xs">
                        Next Available:{" "}
                        {new Date(option.nextAvailable).toLocaleDateString() ===
                        new Date().toLocaleDateString()
                          ? "Today"
                          : new Date(option.nextAvailable).toLocaleDateString()}
                      </span>
                    )}
                  </span>
                </FieldDescription>
              )}
            </FieldContent>
            <RadioGroupItem
              value={option.value}
              id={option.id}
              disabled={option.disabled}
            />
          </Field>
        </FieldLabel>
      ))}
    </RadioGroup>
  );
}

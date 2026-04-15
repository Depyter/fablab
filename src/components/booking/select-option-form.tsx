import { OptionRadioGroup } from "../option-radio-group";

interface RadioGroupChoiceCardProps {
  value: string;
  onValueChange: (value: string) => void;
  disableBuyFromLab?: boolean;
}

export function RadioGroupChoiceCard({
  value,
  onValueChange,
  disableBuyFromLab,
}: RadioGroupChoiceCardProps) {
  const options = [
    {
      value: "provide-own",
      id: "provide-own-materials",
      title: "Provide Materials",
      description: "For client with their own materials.",
    },
    {
      value: "buy-from-lab",
      id: "buy-from-fablab",
      title: "Buy from FabLab",
      description: `User will choose material in the inventory.${
        disableBuyFromLab ? " (No materials available for this service)" : ""
      }`,
      disabled: disableBuyFromLab,
    },
  ];

  return (
    <OptionRadioGroup
      value={value}
      onValueChange={onValueChange}
      options={options}
      className="max-w-full"
    />
  );
}

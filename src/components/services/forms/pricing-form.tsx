import { Plus, Trash2 } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { ServiceFormModeContext } from "@/components/services/forms/service-form";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { withForm } from "@/lib/form-context";
import type { AddServiceFormValues } from "@/types/add-service";
import { addServiceFormOpts } from "@/types/add-service";

type TimeUnit = "minute" | "hour" | "day";
type ServiceCategory = AddServiceFormValues["serviceCategory"];
type Pricing = AddServiceFormValues["pricing"];
type FixedPricing = Extract<Pricing, { type: "FIXED" }>;
type FabricationPricing = Extract<Pricing, { type: "FABRICATION" }>;
type FixedPricingVariant = FixedPricing["variants"][number];
type FabricationPricingVariant = FabricationPricing["variants"][number];

const CURRENCY_ADDON_CLASS =
  "border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground";
const CURRENCY_INPUT_CLASS =
  "border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1";
const DEFAULT_CURRENCY_GROUP_CLASS =
  "flex items-center border-2 border-black rounded-none shadow-none bg-white focus-within:ring-3 focus-within:ring-fab-teal/50 focus-within:border-ring";
const VARIANT_CURRENCY_GROUP_CLASS =
  "flex items-center border-2 border-black transition-shadow focus-within:ring-3 focus-within:border-ring";

const TIME_UNITS: Array<{ value: TimeUnit; label: string }> = [
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
];

const isServiceCategory = (value: string): value is ServiceCategory =>
  value === "WORKSHOP" || value === "FABRICATION";

const isTimeUnit = (value: string): value is TimeUnit =>
  TIME_UNITS.some((unit) => unit.value === value);

const toNumberValue = (value: string) => Number(value) || 0;
const toInputValue = (value: number) => (value === 0 ? "" : value);

const removeItemAtIndex = <T,>(items: Array<T>, index: number) =>
  items.filter((_, itemIndex) => itemIndex !== index);

const updateItemAtIndex = <T extends object>(
  items: Array<T>,
  index: number,
  patch: Partial<T>,
) =>
  items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...patch } : item,
  );

const createPricingForCategory = (category: ServiceCategory): Pricing =>
  category === "WORKSHOP"
    ? {
        type: "FIXED",
        amount: 0,
        variants: [],
      }
    : {
        type: "FABRICATION",
        setupFee: 0,
        unitName: "hour",
        timeRate: 0,
        variants: [],
      };

const appendPricingVariant = (pricing: Pricing): Pricing => {
  if (pricing.type === "FIXED") {
    return {
      ...pricing,
      variants: [...pricing.variants, { name: "", amount: 0 }],
    };
  }

  return {
    ...pricing,
    variants: [
      ...pricing.variants,
      {
        name: "",
        setupFee: pricing.setupFee,
        timeRate: pricing.timeRate,
      },
    ],
  };
};

const removePricingVariant = (pricing: Pricing, index: number): Pricing => {
  if (pricing.type === "FIXED") {
    return {
      ...pricing,
      variants: removeItemAtIndex(pricing.variants, index),
    };
  }

  return {
    ...pricing,
    variants: removeItemAtIndex(pricing.variants, index),
  };
};

interface CurrencyInputProps {
  id?: string;
  groupClassName?: string;
  placeholder?: string;
  value: number;
  onChange: (value: number) => void;
}

function CurrencyInput({
  id,
  groupClassName = DEFAULT_CURRENCY_GROUP_CLASS,
  placeholder = "0.00",
  value,
  onChange,
}: CurrencyInputProps) {
  return (
    <InputGroup className={groupClassName}>
      <InputGroupAddon className={CURRENCY_ADDON_CLASS}>
        <InputGroupText>₱</InputGroupText>
      </InputGroupAddon>
      <Input
        id={id}
        type="number"
        placeholder={placeholder}
        className={CURRENCY_INPUT_CLASS}
        value={toInputValue(value)}
        onChange={(e) => onChange(toNumberValue(e.target.value))}
      />
    </InputGroup>
  );
}

interface FixedPricingSectionProps {
  pricing: FixedPricing;
  variantKeys: Array<string>;
  onAddVariant: () => void;
  onChange: (pricing: FixedPricing) => void;
  onRemoveVariant: (index: number) => void;
}

function FixedPricingSection({
  pricing,
  variantKeys,
  onAddVariant,
  onChange,
  onRemoveVariant,
}: FixedPricingSectionProps) {
  const updateVariant = (
    index: number,
    patch: Partial<FixedPricingVariant>,
  ) => {
    onChange({
      ...pricing,
      variants: updateItemAtIndex(pricing.variants, index, patch),
    });
  };

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="fixedAmount">Default Amount</FieldLabel>
        <CurrencyInput
          id="fixedAmount"
          value={pricing.amount}
          onChange={(amount) => onChange({ ...pricing, amount })}
        />
      </Field>

      {pricing.variants.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Pricing Variants
          </p>
          {pricing.variants.map((variant, index) => (
            <div
              key={variantKeys[index]}
              className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end p-3 rounded-lg border border-dashed border-input bg-muted/30"
            >
              <Field>
                <FieldLabel>Variant Name</FieldLabel>
                <Input
                  placeholder="e.g. UP, Senior, Staff"
                  value={variant.name}
                  onChange={(e) =>
                    updateVariant(index, { name: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Amount</FieldLabel>
                <CurrencyInput
                  groupClassName={VARIANT_CURRENCY_GROUP_CLASS}
                  value={variant.amount}
                  onChange={(amount) => updateVariant(index, { amount })}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive mb-0.5"
                onClick={() => onRemoveVariant(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onAddVariant}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Pricing Variant
      </Button>
    </div>
  );
}

interface FabricationPricingSectionProps {
  pricing: FabricationPricing;
  variantKeys: Array<string>;
  onAddVariant: () => void;
  onChange: (pricing: FabricationPricing) => void;
  onRemoveVariant: (index: number) => void;
}

function FabricationPricingSection({
  pricing,
  variantKeys,
  onAddVariant,
  onChange,
  onRemoveVariant,
}: FabricationPricingSectionProps) {
  const updateVariant = (
    index: number,
    patch: Partial<FabricationPricingVariant>,
  ) => {
    onChange({
      ...pricing,
      variants: updateItemAtIndex(pricing.variants, index, patch),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(120px,160px)_minmax(0,1fr)_minmax(0,1fr)]">
        <Field>
          <FieldLabel htmlFor="fabricationUnitName">Time Unit</FieldLabel>
          <Select
            value={pricing.unitName ?? "hour"}
            onValueChange={(value) => {
              if (!isTimeUnit(value)) return;
              onChange({ ...pricing, unitName: value });
            }}
          >
            <SelectTrigger id="fabricationUnitName" className="w-full">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {TIME_UNITS.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="fabricationSetupFee">
            Default Setup Fee
          </FieldLabel>
          <CurrencyInput
            id="fabricationSetupFee"
            value={pricing.setupFee}
            onChange={(setupFee) => onChange({ ...pricing, setupFee })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="fabricationTimeRate">
            Default Time Rate per Unit
          </FieldLabel>
          <CurrencyInput
            id="fabricationTimeRate"
            value={pricing.timeRate}
            onChange={(timeRate) => onChange({ ...pricing, timeRate })}
          />
        </Field>
      </div>

      {pricing.variants.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Pricing Variants
          </p>
          {pricing.variants.map((variant, index) => (
            <div
              key={variantKeys[index]}
              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-3 rounded-lg border border-dashed border-input bg-muted/30"
            >
              <Field>
                <FieldLabel>Variant Name</FieldLabel>
                <Input
                  placeholder="e.g. UP, Senior"
                  value={variant.name}
                  onChange={(e) =>
                    updateVariant(index, { name: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Setup Fee</FieldLabel>
                <CurrencyInput
                  value={variant.setupFee}
                  onChange={(setupFee) => updateVariant(index, { setupFee })}
                />
              </Field>
              <Field>
                <FieldLabel>
                  Time Rate per {pricing.unitName || "unit"}
                </FieldLabel>
                <CurrencyInput
                  value={variant.timeRate}
                  onChange={(timeRate) => updateVariant(index, { timeRate })}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive mb-0.5"
                onClick={() => onRemoveVariant(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onAddVariant}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Pricing Variant
      </Button>
    </div>
  );
}

export const PricingForm = withForm({
  ...addServiceFormOpts,
  render: function PricingRender({ form }) {
    const serviceFormMode = useContext(ServiceFormModeContext);
    const hideCategorySelector = serviceFormMode !== undefined;
    const pricingValue = form.state.values.pricing;
    const nextVariantKeyRef = useRef(0);
    const createVariantKey = () =>
      `pricing-variant-${nextVariantKeyRef.current++}`;

    const [variantKeys, setVariantKeys] = useState(() =>
      Array.from({ length: pricingValue.variants.length }, createVariantKey),
    );

    useEffect(() => {
      setVariantKeys((prev) => {
        const nextLength = pricingValue.variants.length;
        if (prev.length === nextLength) return prev;
        if (prev.length > nextLength) return prev.slice(0, nextLength);
        return [
          ...prev,
          ...Array.from(
            { length: nextLength - prev.length },
            () => `pricing-variant-${nextVariantKeyRef.current++}`,
          ),
        ];
      });
    }, [pricingValue.variants.length]);

    return (
      <div className="w-full sm:max-w-3xl space-y-6">
        <form.Field
          name="serviceCategory"
          children={(field) =>
            !hideCategorySelector ? (
              <FormSection
                title="Category & Pricing Model"
                description="Define what kind of service this is and how it will be priced."
              >
                <Field>
                  <FieldLabel htmlFor="serviceCategory">
                    Service Category
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (!isServiceCategory(value)) return;

                      field.handleChange(value);
                      form.setFieldValue(
                        "pricing",
                        createPricingForCategory(value),
                      );
                    }}
                  >
                    <SelectTrigger id="serviceCategory">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WORKSHOP">Workshop</SelectItem>
                      <SelectItem value="FABRICATION">Fabrication</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FormSection>
            ) : null
          }
        />

        <form.Field
          name="pricing"
          children={(field) => {
            const pricing = field.state.value;
            const handlePricingChange = (nextPricing: Pricing) =>
              field.handleChange(nextPricing);

            const addVariant = () => {
              setVariantKeys((prev) => [...prev, createVariantKey()]);
              handlePricingChange(appendPricingVariant(pricing));
            };

            const removeVariant = (index: number) => {
              setVariantKeys((prev) => removeItemAtIndex(prev, index));
              handlePricingChange(removePricingVariant(pricing, index));
            };

            return (
              <FormSection title="Pricing Details" className="space-y-4">
                <div className="pt-2 space-y-6">
                  {pricing.type === "FIXED" ? (
                    <FixedPricingSection
                      pricing={pricing}
                      variantKeys={variantKeys}
                      onAddVariant={addVariant}
                      onChange={handlePricingChange}
                      onRemoveVariant={removeVariant}
                    />
                  ) : (
                    <FabricationPricingSection
                      pricing={pricing}
                      variantKeys={variantKeys}
                      onAddVariant={addVariant}
                      onChange={handlePricingChange}
                      onRemoveVariant={removeVariant}
                    />
                  )}
                </div>
              </FormSection>
            );
          }}
        />
      </div>
    );
  },
});

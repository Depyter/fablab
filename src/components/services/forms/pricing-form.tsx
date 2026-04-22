import { withForm } from "@/lib/form-context";
import { addServiceFormOpts } from "@/types/add-service";
import { FormSection } from "@/components/ui/form-section";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

type TimeUnit = "minute" | "hour" | "day";
const TIME_UNITS: { value: TimeUnit; label: string }[] = [
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
];

export const PricingForm = withForm({
  ...addServiceFormOpts,
  render: function PricingRender({ form }) {
    return (
      <div className="w-full sm:max-w-3xl space-y-6">
        <form.Field
          name="serviceCategory"
          children={(field) => (
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
                  onValueChange={(val) => {
                    field.handleChange(val as "WORKSHOP" | "FABRICATION");
                    if (val === "WORKSHOP") {
                      form.setFieldValue("pricing", {
                        type: "FIXED",
                        amount: 0,
                        variants: [],
                      });
                    } else {
                      form.setFieldValue("pricing", {
                        type: "FABRICATION",
                        setupFee: 0,
                        unitName: "hour" as TimeUnit,
                        timeRate: 0,
                        variants: [],
                      });
                    }
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
          )}
        />

        <form.Field
          name="pricing"
          children={(field) => {
            const pricing = field.state.value;
            const pricingType = pricing.type;

            const handleTypeChange = (newType: string) => {
              if (newType === "FIXED") {
                field.handleChange({ type: "FIXED", amount: 0, variants: [] });
              } else if (newType === "FABRICATION") {
                field.handleChange({
                  type: "FABRICATION",
                  setupFee: 0,
                  unitName: "hour" as TimeUnit,
                  timeRate: 0,
                  variants: [],
                });
              }
            };

            const addVariant = () => {
              if (pricing.type === "FIXED") {
                field.handleChange({
                  ...pricing,
                  variants: [...pricing.variants, { name: "", amount: 0 }],
                });
              } else if (pricing.type === "FABRICATION") {
                field.handleChange({
                  ...pricing,
                  variants: [
                    ...pricing.variants,
                    {
                      name: "",
                      setupFee: pricing.setupFee,
                      timeRate: pricing.timeRate,
                    },
                  ],
                });
              }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getVariants = () => pricing.variants as any[];

            const removeVariant = (index: number) => {
              field.handleChange({
                ...pricing,
                variants: getVariants().filter((_, i) => i !== index),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any);
            };

            const updateVariant = (
              index: number,
              patch: Record<string, unknown>,
            ) => {
              const updated = getVariants().map((v, i) =>
                i === index ? { ...v, ...patch } : v,
              );
              field.handleChange({
                ...pricing,
                variants: updated,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any);
            };

            return (
              <FormSection title="Pricing Details" className="space-y-4">
                <div className="pt-2 space-y-6">
                  {/* ── FIXED ──────────────────────────────────────────── */}
                  {pricingType === "FIXED" && (
                    <div className="space-y-4">
                      <Field>
                        <FieldLabel htmlFor="fixedAmount">
                          Default Amount
                        </FieldLabel>
                        <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                          <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                          </InputGroupAddon>
                          <Input
                            id="fixedAmount"
                            type="number"
                            placeholder="0.00"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                            value={pricing.amount === 0 ? "" : pricing.amount}
                            onChange={(e) =>
                              field.handleChange({
                                ...pricing,
                                amount: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </InputGroup>
                      </Field>

                      {/* Variants */}
                      {pricing.variants.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-muted-foreground">
                            Pricing Variants
                          </p>
                          {pricing.variants.map((variant, i) => (
                            <div
                              key={i}
                              className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end p-3 rounded-lg border border-dashed border-input bg-muted/30"
                            >
                              <Field>
                                <FieldLabel>Variant Name</FieldLabel>
                                <Input
                                  placeholder="e.g. UP, Senior, Staff"
                                  value={variant.name}
                                  onChange={(e) =>
                                    updateVariant(i, { name: e.target.value })
                                  }
                                />
                              </Field>
                              <Field>
                                <FieldLabel>Amount</FieldLabel>
                                <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                                  <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                                    <InputGroupText>₱</InputGroupText>
                                  </InputGroupAddon>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                                    value={
                                      variant.amount === 0 ? "" : variant.amount
                                    }
                                    onChange={(e) =>
                                      updateVariant(i, {
                                        amount: Number(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </InputGroup>
                              </Field>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive mb-0.5"
                                onClick={() => removeVariant(i)}
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
                        onClick={addVariant}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Pricing Variant
                      </Button>
                    </div>
                  )}


                  {/* ── FABRICATION ─────────────────────────────────────── */}
                  {pricingType === "FABRICATION" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field>
                          <FieldLabel htmlFor="fabricationUnitName">
                            Time Unit
                          </FieldLabel>
                          <Select
                            value={pricing.unitName ?? "hour"}
                            onValueChange={(val) =>
                              field.handleChange({
                                ...pricing,
                                unitName: val as TimeUnit,
                              })
                            }
                          >
                            <SelectTrigger id="fabricationUnitName">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_UNITS.map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="fabricationSetupFee">
                            Default Setup Fee
                          </FieldLabel>
                          <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                            <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                              <InputGroupText>₱</InputGroupText>
                            </InputGroupAddon>
                            <Input
                              id="fabricationSetupFee"
                              type="number"
                              placeholder="0.00"
                              className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                              value={
                                pricing.setupFee === 0 ? "" : pricing.setupFee
                              }
                              onChange={(e) =>
                                field.handleChange({
                                  ...pricing,
                                  setupFee: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </InputGroup>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="fabricationTimeRate">
                            Default Time Rate per Unit
                          </FieldLabel>
                          <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                            <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                              <InputGroupText>₱</InputGroupText>
                            </InputGroupAddon>
                            <Input
                              id="fabricationTimeRate"
                              type="number"
                              placeholder="0.00"
                              className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                              value={
                                pricing.timeRate === 0 ? "" : pricing.timeRate
                              }
                              onChange={(e) =>
                                field.handleChange({
                                  ...pricing,
                                  timeRate: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </InputGroup>
                        </Field>
                      </div>

                      {/* Variants */}
                      {pricing.variants.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-muted-foreground">
                            Pricing Variants
                          </p>
                          {pricing.variants.map((variant, i) => (
                            <div
                              key={i}
                              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-3 rounded-lg border border-dashed border-input bg-muted/30"
                            >
                              <Field>
                                <FieldLabel>Variant Name</FieldLabel>
                                <Input
                                  placeholder="e.g. UP, Senior"
                                  value={variant.name}
                                  onChange={(e) =>
                                    updateVariant(i, { name: e.target.value })
                                  }
                                />
                              </Field>
                              <Field>
                                <FieldLabel>Setup Fee</FieldLabel>
                                <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                                  <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                                    <InputGroupText>₱</InputGroupText>
                                  </InputGroupAddon>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                                    value={
                                      variant.setupFee === 0
                                        ? ""
                                        : variant.setupFee
                                    }
                                    onChange={(e) =>
                                      updateVariant(i, {
                                        setupFee: Number(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </InputGroup>
                              </Field>
                              <Field>
                                <FieldLabel>
                                  Time Rate per {pricing.unitName || "unit"}
                                </FieldLabel>
                                <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                                  <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                                    <InputGroupText>₱</InputGroupText>
                                  </InputGroupAddon>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                                    value={
                                      variant.timeRate === 0
                                        ? ""
                                        : variant.timeRate
                                    }
                                    onChange={(e) =>
                                      updateVariant(i, {
                                        timeRate: Number(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </InputGroup>
                              </Field>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive mb-0.5"
                                onClick={() => removeVariant(i)}
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
                        onClick={addVariant}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Pricing Variant
                      </Button>
                    </div>
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

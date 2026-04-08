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
                  onValueChange={(val) =>
                    field.handleChange(val as "WORKSHOP" | "FABRICATION")
                  }
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
                field.handleChange({
                  type: "FIXED",
                  amount: 0,
                  upAmount: undefined,
                });
              } else if (newType === "PER_UNIT") {
                field.handleChange({
                  type: "PER_UNIT",
                  baseFee: 0,
                  upBaseFee: undefined,
                  unitName: "hour",
                  ratePerUnit: 0,
                  upRatePerUnit: undefined,
                });
              } else if (newType === "COMPOSITE") {
                field.handleChange({
                  type: "COMPOSITE",
                  baseFee: 0,
                  upBaseFee: undefined,
                  timeRatePerHour: 0,
                  upTimeRatePerHour: undefined,
                });
              }
            };

            return (
              <FormSection title="Pricing Details" className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="pricingType">Pricing Model</FieldLabel>
                  <Select value={pricingType} onValueChange={handleTypeChange}>
                    <SelectTrigger id="pricingType">
                      <SelectValue placeholder="Select Pricing Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Fixed Price</SelectItem>
                      <SelectItem value="PER_UNIT">Per Unit</SelectItem>
                      <SelectItem value="COMPOSITE">
                        Composite (Time + Material)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="pt-2">
                  {pricingType === "FIXED" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="fixedAmount">Amount</FieldLabel>
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

                      <Field>
                        <FieldLabel htmlFor="fixedUpAmount">
                          UP Amount (Optional)
                        </FieldLabel>
                        <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                          <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                          </InputGroupAddon>
                          <Input
                            id="fixedUpAmount"
                            type="number"
                            placeholder="0.00"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                            value={pricing.upAmount ?? ""}
                            onChange={(e) =>
                              field.handleChange({
                                ...pricing,
                                upAmount:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </InputGroup>
                      </Field>
                    </div>
                  )}

                  {pricingType === "PER_UNIT" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="perUnitBaseFee">
                          Base Fee
                        </FieldLabel>
                        <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                          <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                          </InputGroupAddon>
                          <Input
                            id="perUnitBaseFee"
                            type="number"
                            placeholder="0.00"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                            value={pricing.baseFee === 0 ? "" : pricing.baseFee}
                            onChange={(e) =>
                              field.handleChange({
                                ...pricing,
                                baseFee: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </InputGroup>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="perUnitUpBaseFee">
                          UP Base Fee (Optional)
                        </FieldLabel>
                        <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                          <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                          </InputGroupAddon>
                          <Input
                            id="perUnitUpBaseFee"
                            type="number"
                            placeholder="0.00"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                            value={pricing.upBaseFee ?? ""}
                            onChange={(e) =>
                              field.handleChange({
                                ...pricing,
                                upBaseFee:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </InputGroup>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="perUnitRate">
                          Rate per Unit
                        </FieldLabel>
                        <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                          <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                          </InputGroupAddon>
                          <Input
                            id="perUnitRate"
                            type="number"
                            placeholder="0.00"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                            value={
                              pricing.ratePerUnit === 0
                                ? ""
                                : pricing.ratePerUnit
                            }
                            onChange={(e) =>
                              field.handleChange({
                                ...pricing,
                                ratePerUnit: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </InputGroup>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="perUnitUpRate">
                          UP Rate per Unit (Optional)
                        </FieldLabel>
                        <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                          <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                          </InputGroupAddon>
                          <Input
                            id="perUnitUpRate"
                            type="number"
                            placeholder="0.00"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                            value={pricing.upRatePerUnit ?? ""}
                            onChange={(e) =>
                              field.handleChange({
                                ...pricing,
                                upRatePerUnit:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </InputGroup>
                      </Field>

                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="perUnitName">Unit Name</FieldLabel>
                        <Input
                          id="perUnitName"
                          placeholder="e.g. hour, sqft, piece"
                          value={pricing.unitName}
                          onChange={(e) =>
                            field.handleChange({
                              ...pricing,
                              unitName: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                  )}

                  {pricingType === "COMPOSITE" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="compositeBaseFee">
                          Base Fee
                        </FieldLabel>
                        <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                          <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                          </InputGroupAddon>
                          <Input
                            id="compositeBaseFee"
                            type="number"
                            placeholder="0.00"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                            value={pricing.baseFee === 0 ? "" : pricing.baseFee}
                            onChange={(e) =>
                              field.handleChange({
                                ...pricing,
                                baseFee: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </InputGroup>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="compositeUpBaseFee">
                          UP Base Fee (Optional)
                        </FieldLabel>
                        <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                          <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                          </InputGroupAddon>
                          <Input
                            id="compositeUpBaseFee"
                            type="number"
                            placeholder="0.00"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                            value={pricing.upBaseFee ?? ""}
                            onChange={(e) =>
                              field.handleChange({
                                ...pricing,
                                upBaseFee:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </InputGroup>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="compositeTimeRate">
                          Time Rate (per Hour)
                        </FieldLabel>
                        <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                          <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                          </InputGroupAddon>
                          <Input
                            id="compositeTimeRate"
                            type="number"
                            placeholder="0.00"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                            value={
                              pricing.timeRatePerHour === 0
                                ? ""
                                : pricing.timeRatePerHour
                            }
                            onChange={(e) =>
                              field.handleChange({
                                ...pricing,
                                timeRatePerHour: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </InputGroup>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="compositeUpTimeRate">
                          UP Time Rate (Optional)
                        </FieldLabel>
                        <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400">
                          <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                          </InputGroupAddon>
                          <Input
                            id="compositeUpTimeRate"
                            type="number"
                            placeholder="0.00"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                            value={pricing.upTimeRatePerHour ?? ""}
                            onChange={(e) =>
                              field.handleChange({
                                ...pricing,
                                upTimeRatePerHour:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </InputGroup>
                      </Field>
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

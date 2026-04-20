export type ServicePricing =
  | {
      type: "FIXED";
      amount: number;
      variants?: Array<{ name: string; amount: number }>;
    }
  | {
      type: "PER_UNIT";
      setupFee: number;
      unitName: string;
      ratePerUnit: number;
      variants?: Array<{ name: string; setupFee: number; ratePerUnit: number }>;
    }
  | {
      type: "COMPOSITE";
      setupFee: number;
      unitName: string;
      timeRate: number;
      variants?: Array<{ name: string; setupFee: number; timeRate: number }>;
    };

export type PricingServiceType = "self-service" | "full-service" | "workshop";

export interface PricingBreakdown {
  setupFee: number;
  materialCost: number;
  timeCost: number;
  total: number;
}

export interface DerivedPricing extends PricingBreakdown {
  duration: number;
  rate: number;
  unitName: string;
}

export function unitToMinutes(unit: string): number {
  if (unit === "hour") return 60;
  if (unit === "day") return 60 * 24;
  return 1;
}

export function getPricingVariantKey(pricingVariant?: string | null) {
  if (!pricingVariant || pricingVariant === "Default") return null;
  return pricingVariant;
}

export function getDurationMinutesFromTimeRange(
  startTime?: string,
  endTime?: string,
) {
  if (!startTime || !endTime) return 0;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  return endH * 60 + endM - (startH * 60 + startM);
}

export function derivePricingFromSchema(args: {
  servicePricing?: ServicePricing | null;
  pricingVariant?: string | null;
  serviceType?: PricingServiceType | null;
  bookingDurationMinutes?: number;
  materialCost?: number;
}): DerivedPricing {
  const {
    servicePricing,
    pricingVariant,
    serviceType,
    bookingDurationMinutes = 0,
    materialCost = 0,
  } = args;

  if (!servicePricing) {
    return {
      setupFee: 0,
      materialCost,
      timeCost: 0,
      total: materialCost,
      duration: 0,
      rate: 0,
      unitName: "unit",
    };
  }

  const selectedVariant = getPricingVariantKey(pricingVariant);
  const isSelfService = serviceType === "self-service";

  if (servicePricing.type === "FIXED") {
    const variant = selectedVariant
      ? servicePricing.variants?.find((v) => v.name === selectedVariant)
      : undefined;
    const amount = variant ? variant.amount : servicePricing.amount;
    const setupFee = isSelfService ? 0 : amount;

    return {
      setupFee,
      materialCost,
      timeCost: 0,
      total: setupFee + materialCost,
      duration: 0,
      rate: 0,
      unitName: "unit",
    };
  }

  if (servicePricing.type === "PER_UNIT") {
    const variant = selectedVariant
      ? servicePricing.variants?.find((v) => v.name === selectedVariant)
      : undefined;
    const unitName = servicePricing.unitName;
    const duration = bookingDurationMinutes / unitToMinutes(unitName);
    const rate = variant ? variant.ratePerUnit : servicePricing.ratePerUnit;
    const setupFee = isSelfService
      ? 0
      : variant
        ? variant.setupFee
        : servicePricing.setupFee;
    const timeCost = duration * rate;

    return {
      setupFee,
      materialCost,
      timeCost,
      total: setupFee + timeCost + materialCost,
      duration,
      rate,
      unitName,
    };
  }

  const variant = selectedVariant
    ? servicePricing.variants?.find((v) => v.name === selectedVariant)
    : undefined;
  const unitName = servicePricing.unitName;
  const duration = bookingDurationMinutes / unitToMinutes(unitName);
  const rate = variant ? variant.timeRate : servicePricing.timeRate;
  const setupFee = isSelfService
    ? 0
    : variant
      ? variant.setupFee
      : servicePricing.setupFee;
  const timeCost = duration * rate;

  return {
    setupFee,
    materialCost,
    timeCost,
    total: setupFee + timeCost + materialCost,
    duration,
    rate,
    unitName,
  };
}

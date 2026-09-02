export const BILLING_FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Every 3 months" },
  { value: "semiannual", label: "Every 6 months" },
  { value: "annual", label: "Annually" },
  { value: "custom", label: "Custom" },
] as const;

export type BillingFrequency = typeof BILLING_FREQUENCIES[number]["value"];
export type BillingIntervalUnit = "days" | "weeks" | "months";
export type ContractLengthUnit = BillingIntervalUnit | "years";

export type MembershipOption = {
  id: string;
  name: string;
  price: number;
  billingFrequency: BillingFrequency;
  billingInterval: number;
  billingIntervalUnit: BillingIntervalUnit;
  contractLength: number;
  contractLengthUnit: ContractLengthUnit;
  enrollmentFee: number;
  annualFee: number;
  additionalFees: number;
  additionalFeesDetails: string;
  access: string[];
  purchaseUrl: string;
  notes: string;
};

const frequencies = new Set<string>(BILLING_FREQUENCIES.map(({ value }) => value));
const createMembershipId = () => typeof globalThis.crypto?.randomUUID === "function"
  ? globalThis.crypto.randomUUID()
  : `membership-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const amount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function emptyMembershipOption(): MembershipOption {
  return {
    id: createMembershipId(), name: "", price: 0, billingFrequency: "monthly",
    billingInterval: 1, billingIntervalUnit: "months", contractLength: 1, contractLengthUnit: "months",
    enrollmentFee: 0, annualFee: 0, additionalFees: 0,
    additionalFeesDetails: "", access: [], purchaseUrl: "", notes: "",
  };
}

export function cleanMembershipOptions(value: unknown): MembershipOption[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 25).filter(item => item && typeof item === "object").map((item) => {
    const raw = item as Record<string, unknown>;
    const billingFrequency = text(raw.billingFrequency);
    const billingIntervalUnit = text(raw.billingIntervalUnit);
    const contractLengthUnit = text(raw.contractLengthUnit);
    return {
      id: text(raw.id) || createMembershipId(),
      name: text(raw.name),
      price: amount(raw.price),
      billingFrequency: (frequencies.has(billingFrequency) ? billingFrequency : "monthly") as BillingFrequency,
      billingInterval: Math.max(1, amount(raw.billingInterval) || 1),
      billingIntervalUnit: (["days", "weeks", "months"].includes(billingIntervalUnit) ? billingIntervalUnit : "months") as BillingIntervalUnit,
      contractLength: Math.max(1, amount(raw.contractLength) || amount(raw.contractLengthMonths) || 1),
      contractLengthUnit: (["days", "weeks", "months", "years"].includes(contractLengthUnit) ? contractLengthUnit : "months") as ContractLengthUnit,
      enrollmentFee: amount(raw.enrollmentFee),
      annualFee: amount(raw.annualFee),
      additionalFees: amount(raw.additionalFees),
      additionalFeesDetails: text(raw.additionalFeesDetails),
      access: Array.isArray(raw.access)
        ? raw.access.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean)
        : text(raw.access).split(/[\n,]/).map(item => item.trim()).filter(Boolean),
      purchaseUrl: text(raw.purchaseUrl),
      notes: text(raw.notes),
    };
  });
}

function rawRecurringMonthlyPrice(option: MembershipOption) {
  const customIntervalMonths = option.billingIntervalUnit === "days" ? option.billingInterval * 12 / 365.25
    : option.billingIntervalUnit === "weeks" ? option.billingInterval * 12 / 52
      : option.billingInterval;
  const recurring = option.billingFrequency === "custom" ? option.price / Math.max(customIntervalMonths, 1 / 31)
    : option.billingFrequency === "weekly" ? option.price * 52 / 12
    : option.billingFrequency === "biweekly" ? option.price * 26 / 12
      : option.billingFrequency === "quarterly" ? option.price / 3
        : option.billingFrequency === "semiannual" ? option.price / 6
          : option.billingFrequency === "annual" ? option.price / 12
            : option.price;
  return recurring;
}

export function recurringMonthlyPrice(option: MembershipOption) {
  return Math.round(rawRecurringMonthlyPrice(option) * 100) / 100;
}

export function effectiveMonthlyPrice(option: MembershipOption) {
  const recurring = rawRecurringMonthlyPrice(option);
  const contractMonths = Math.max(1 / 31, option.contractLengthUnit === "days" ? option.contractLength * 12 / 365.25
    : option.contractLengthUnit === "weeks" ? option.contractLength * 12 / 52
      : option.contractLengthUnit === "years" ? option.contractLength * 12
        : option.contractLength);
  return Math.round((recurring + option.annualFee / 12 + (option.enrollmentFee + option.additionalFees) / contractMonths) * 100) / 100;
}

export function lowestMembershipOption(options: MembershipOption[]) {
  return options.reduce<MembershipOption | null>((lowest, option) =>
    !lowest || effectiveMonthlyPrice(option) < effectiveMonthlyPrice(lowest) ? option : lowest, null);
}

const quantityLabel = (value: number, unit: string) => `${value} ${value === 1 ? unit.replace(/s$/, "") : unit}`;

export function billingFrequencyLabel(option: MembershipOption) {
  return option.billingFrequency === "custom"
    ? `Every ${quantityLabel(option.billingInterval, option.billingIntervalUnit)}`
    : BILLING_FREQUENCIES.find(item => item.value === option.billingFrequency)?.label ?? "Monthly";
}

export function contractLengthLabel(option: MembershipOption) {
  return option.contractLength === 1 && option.contractLengthUnit === "months"
    ? "Month-to-month"
    : quantityLabel(option.contractLength, option.contractLengthUnit);
}

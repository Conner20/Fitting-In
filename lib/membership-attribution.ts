import { MembershipOption, cleanMembershipOptions } from "./memberships";

export type MembershipCharge = {
  total: number;
  recurring: number;
  enrollment: number;
  additional: number;
  annual: number;
};

const cents = (value: number) => Math.round(value * 100);
const dollars = (value: number) => Math.round(value) / 100;
const utcDate = (value: string | Date) => {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
};
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
const addMonths = (date: Date, months: number) => {
  const targetMonth = date.getUTCMonth() + months;
  const first = new Date(Date.UTC(date.getUTCFullYear(), targetMonth, 1));
  const finalDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(date.getUTCDate(), finalDay)));
};
const inReviewWindow = (date: Date, start: Date, end: Date, contractEnd: Date | null) => date > start && date <= end && (!contractEnd || date < contractEnd);

export function membershipTermsFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const terms = (metadata as Record<string, unknown>).membershipTerms;
  return cleanMembershipOptions(Array.isArray(terms) ? terms : terms ? [terms] : [])[0] ?? null;
}

export function membershipContractEnd(option: MembershipOption, start: Date) {
  if (option.contractLength === 1 && option.contractLengthUnit === "months") return null;
  if (option.contractLengthUnit === "days") return addDays(start, option.contractLength);
  if (option.contractLengthUnit === "weeks") return addDays(start, option.contractLength * 7);
  return addMonths(start, option.contractLength * (option.contractLengthUnit === "years" ? 12 : 1));
}

function recurringChargeDates(option: MembershipOption, start: Date, periodStart: Date, periodEnd: Date) {
  const dates: Date[] = [];
  const fixedDays = option.billingFrequency === "weekly" ? 7
    : option.billingFrequency === "biweekly" ? 14
      : option.billingFrequency === "custom" && option.billingIntervalUnit === "days" ? option.billingInterval
        : option.billingFrequency === "custom" && option.billingIntervalUnit === "weeks" ? option.billingInterval * 7
          : null;
  const intervalMonths = option.billingFrequency === "monthly" ? 1
    : option.billingFrequency === "quarterly" ? 3
      : option.billingFrequency === "semiannual" ? 6
        : option.billingFrequency === "annual" ? 12
          : option.billingFrequency === "custom" && option.billingIntervalUnit === "months" ? option.billingInterval
            : null;
  if (fixedDays) {
    const elapsed = Math.max(0, Math.floor((periodStart.getTime() - start.getTime()) / 86_400_000));
    let index = Math.max(0, Math.floor(elapsed / fixedDays));
    let date = addDays(start, index * fixedDays);
    while (date <= periodStart) date = addDays(start, ++index * fixedDays);
    while (date <= periodEnd) { dates.push(date); date = addDays(start, ++index * fixedDays); }
  } else if (intervalMonths) {
    let index = Math.max(0, Math.floor(((periodStart.getUTCFullYear() - start.getUTCFullYear()) * 12 + periodStart.getUTCMonth() - start.getUTCMonth()) / intervalMonths));
    let date = addMonths(start, index * intervalMonths);
    while (date <= periodStart) date = addMonths(start, ++index * intervalMonths);
    while (date <= periodEnd) { dates.push(date); date = addMonths(start, ++index * intervalMonths); }
  }
  return dates;
}

function firstAnnualFeeDate(option: MembershipOption, start: Date) {
  if (option.annualFeeTiming === "anniversary") return addMonths(start, 12);
  if (option.annualFeeTiming === "after_joining") {
    if (option.annualFeeOffsetUnit === "days") return addDays(start, option.annualFeeOffset);
    if (option.annualFeeOffsetUnit === "weeks") return addDays(start, option.annualFeeOffset * 7);
    return addMonths(start, option.annualFeeOffset);
  }
  let date = new Date(Date.UTC(start.getUTCFullYear(), option.annualFeeMonth - 1, option.annualFeeDay));
  if (date < start) date = new Date(Date.UTC(start.getUTCFullYear() + 1, option.annualFeeMonth - 1, option.annualFeeDay));
  return date;
}

function annualFeesInPeriod(option: MembershipOption, start: Date, periodStart: Date, periodEnd: Date, contractEnd: Date | null, initial = false) {
  if (option.annualFee <= 0) return 0;
  const first = firstAnnualFeeDate(option, start);
  if (initial) return first.getTime() === start.getTime() ? dollars(cents(option.annualFee)) : 0;
  let index = Math.max(0, periodStart.getUTCFullYear() - first.getUTCFullYear() - 1);
  let date = addMonths(first, index * 12);
  while (date <= periodStart) date = addMonths(first, ++index * 12);
  let count = 0;
  while (date <= periodEnd) { if (inReviewWindow(date, periodStart, periodEnd, contractEnd)) count += 1; date = addMonths(first, ++index * 12); }
  return dollars(cents(option.annualFee) * count);
}

export function membershipChargeForPeriod(option: MembershipOption, startValue: string | Date, periodIndex: number): MembershipCharge | null {
  const start = utcDate(startValue);
  if (!start || periodIndex < 0) return null;
  const contractEnd = membershipContractEnd(option, start);
  if (periodIndex === 0) {
    const recurring=dollars(cents(option.price)),enrollment=dollars(cents(option.enrollmentFee)),additional=dollars(cents(option.additionalFees)),annual=annualFeesInPeriod(option,start,start,start,contractEnd,true);
    return { total:dollars(cents(recurring)+cents(enrollment)+cents(additional)+cents(annual)),recurring,enrollment,additional,annual };
  }
  const periodStart = addMonths(start, periodIndex - 1);
  const naturalEnd = addMonths(start, periodIndex);
  if (contractEnd && periodStart >= contractEnd) return null;
  const effectiveEnd = contractEnd && contractEnd < naturalEnd ? contractEnd : naturalEnd;
  const recurringCount = recurringChargeDates(option, start, periodStart, effectiveEnd).filter(date => inReviewWindow(date, periodStart, effectiveEnd, contractEnd)).length;
  const recurring = dollars(cents(option.price) * recurringCount);
  const enrollment = 0;
  const additional = 0;
  const annual = annualFeesInPeriod(option, start, periodStart, effectiveEnd, contractEnd);
  return { total: dollars(cents(recurring) + cents(enrollment) + cents(additional) + cents(annual)), recurring, enrollment, additional, annual };
}

export function membershipPeriod(option: MembershipOption, startValue: string | Date, periodIndex: number) {
  const start = utcDate(startValue);
  if (!start) return null;
  if (periodIndex < 1) return null;
  const periodStart = addMonths(start, periodIndex - 1);
  const contractEnd = membershipContractEnd(option, start);
  if (contractEnd && periodStart >= contractEnd) return null;
  const naturalEnd = addMonths(start, periodIndex);
  const periodEnd = contractEnd && contractEnd < naturalEnd ? contractEnd : naturalEnd;
  return { start: isoDay(periodStart), end: isoDay(periodEnd), due: periodEnd, contractEnds: Boolean(contractEnd && periodEnd.getTime() === contractEnd.getTime()) };
}

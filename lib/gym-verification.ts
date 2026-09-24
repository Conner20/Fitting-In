export const GYM_REVIEW_SECTIONS = {
  "Identity and location": ["name", "address", "phone", "contactEmail", "website", "gymType", "city", "state", "country", "lat", "lng"],
  "Facility details": ["hours", "amenities", "equipment"],
  "Day pass options": ["dayPassOptions"],
  "Membership options": ["membershipOptions"],
  Photos: ["coverPhotoUrl", "photoUrls"],
} as const;

const comparable = (field: string, value: unknown) => {
  if ((field === "dayPassOptions" || field === "membershipOptions") && Array.isArray(value)) {
    return JSON.stringify(value.map((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) return option;
      const { id: _internalId, ...visibleOption } = option as Record<string, unknown>;
      return visibleOption;
    }));
  }
  return JSON.stringify(value ?? null);
};

export function changedGymSections(before: Record<string, unknown>, after: Record<string, unknown>) {
  return Object.entries(GYM_REVIEW_SECTIONS)
    .filter(([, fields]) => fields.some((field) => comparable(field, before[field]) !== comparable(field, after[field])))
    .map(([section]) => section);
}

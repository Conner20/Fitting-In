import { db } from "@/prisma/client";

const GYM_TYPES = new Set(["Open", "Personal training gym", "Group training gym", "Specialty gym/studio"]);

export function gymSlug(name: string) {
    const base = name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "gym";
    return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function userCanEditGym(userId: string, gymId: string) {
    const access = await db.gymAccess.findUnique({
        where: { gymId_userId: { gymId, userId } },
        select: { id: true, gym: { select: { isVerified: true } }, user: { select: { role: true } } },
    });
    return Boolean(access?.gym.isVerified && access.user.role === "GYM");
}

export function cleanGymInput(body: Record<string, unknown>) {
    const text = (key: string, fallback = "") =>
        typeof body[key] === "string" ? (body[key] as string).trim() : fallback;
    const optionalText = (key: string) => {
        if (!(key in body)) return undefined;
        return text(key) || null;
    };
    const number = (key: string, fallback = 0) => {
        const value = Number(body[key]);
        return Number.isFinite(value) ? value : fallback;
    };
    const optionalNumber = (key: string) => {
        if (!(key in body) || body[key] === "" || body[key] == null) return null;
        const value = Number(body[key]);
        return Number.isFinite(value) ? value : null;
    };
    const stringList = (key: string) => Array.isArray(body[key])
        ? (body[key] as unknown[]).filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
        : [];
    const gymType = optionalText("gymType");
    return {
        name: text("name"),
        address: text("address"),
        phone: text("phone"),
        website: text("website").replace(/^https?:\/\//i, "").replace(/\/$/, ""),
        gymType: gymType === "Open gym" ? "Open" : gymType,
        city: optionalText("city"),
        state: optionalText("state"),
        country: optionalText("country"),
        lat: body.lat == null ? undefined : number("lat"),
        lng: body.lng == null ? undefined : number("lng"),
        amenities: stringList("amenities"),
        equipment: stringList("equipment"),
        dayPassPrice: optionalNumber("dayPassPrice"),
        dayPassDetails: optionalText("dayPassDetails"),
        dayPassUrl: optionalText("dayPassUrl"),
        hours: optionalText("hours"),
        contactEmail: optionalText("contactEmail"),
        coverPhotoUrl: optionalText("coverPhotoUrl"),
        photoUrls: stringList("photoUrls"),
        isPublished: body.isPublished !== false,
    };
}

export function validateCompleteGymInput(body: Record<string, unknown>, data: ReturnType<typeof cleanGymInput>) {
    const missing: string[] = [];
    const requireText = (key: keyof typeof data, label: string) => {
        const value = data[key];
        if (typeof value !== "string" || !value.trim()) missing.push(label);
    };
    const requireList = (key: "amenities" | "equipment" | "photoUrls", label: string) => {
        if (!data[key].length) missing.push(label);
    };
    [
        ["name", "gym name"], ["address", "street address"], ["city", "city"], ["state", "state"],
        ["country", "country"], ["phone", "phone"], ["contactEmail", "contact email"], ["website", "website"],
        ["gymType", "gym type"], ["dayPassDetails", "day pass duration"],
        ["hours", "hours"], ["coverPhotoUrl", "cover photo"],
    ].forEach(([key, label]) => requireText(key as keyof typeof data, label));
    if (!data.gymType || !GYM_TYPES.has(data.gymType)) missing.push("gym type");
    if (!data.dayPassDetails || !/^\d+$/.test(data.dayPassDetails) || Number(data.dayPassDetails) < 1) missing.push("day pass duration in whole days");
    requireList("amenities", "amenities");
    requireList("equipment", "equipment");
    requireList("photoUrls", "amenity photos");
    ["dayPassPrice"].forEach((key) => {
        if (!(key in body) || body[key] === "" || body[key] == null || !Number.isFinite(Number(body[key]))) missing.push(key);
    });
    if (body.lat == null || body.lat === "" || !Number.isFinite(Number(body.lat))) missing.push("mapped latitude");
    if (body.lng == null || body.lng === "" || !Number.isFinite(Number(body.lng))) missing.push("mapped longitude");
    return [...new Set(missing)];
}

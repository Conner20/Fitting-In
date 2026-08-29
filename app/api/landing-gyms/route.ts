import { NextResponse } from "next/server";
import { db } from "@/prisma/client";

const GYM_TYPES = new Set(["Open", "Personal training gym", "Group training gym", "Specialty gym/studio"]);

export async function GET() {
    const gyms = await db.gym.findMany({
        where: { isPublished: true }, orderBy: { name: "asc" },
        select: { id: true, name: true, city: true, state: true, address: true, lat: true, lng: true, gymType: true, equipment: true, amenities: true, hours: true, phone: true, contactEmail: true, website: true, coverPhotoUrl: true, photoUrls: true, dayPassPrice: true, dayPassDetails: true, dayPassUrl: true, isVerified: true },
    });
    return NextResponse.json({ gyms: gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        isVerified: gym.isVerified,
        area: [gym.city, gym.state].filter(Boolean).join(", "),
        address: gym.address,
        lat: gym.lat,
        lng: gym.lng,
        type: gym.gymType === "Open gym" ? "Open" : gym.gymType && GYM_TYPES.has(gym.gymType) ? gym.gymType : "Open",
        equipment: gym.equipment,
        amenities: gym.amenities,
        hours: gym.hours || "Contact gym for hours",
        phone: gym.phone,
        contactEmail: gym.contactEmail,
        site: gym.website,
        photo: gym.coverPhotoUrl || gym.photoUrls[0] || "",
        photoUrls: gym.photoUrls,
        dayPassPrice: gym.dayPassPrice,
        dayPassDetails: gym.dayPassDetails,
        dayPassUrl: gym.dayPassUrl,
    })) });
}

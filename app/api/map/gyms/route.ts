import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geocoding";
import { db } from "@/prisma/client";

type Role = "TRAINEE" | "TRAINER" | "GYM";

async function backfillProfileCoordsFromSignupLocation(
    userId: string,
    role: Role | null,
    location: string | null
) {
    if (!role || !location?.trim()) return null;

    const geocoded = await geocodeAddress(location);
    if (!geocoded) return null;

    const geoData = {
        city: geocoded.city,
        state: geocoded.state,
        country: geocoded.country,
        lat: geocoded.lat,
        lng: geocoded.lng,
    };

    if (role === "TRAINEE") {
        await db.traineeProfile.update({
            where: { userId },
            data: geoData,
        });
    } else if (role === "TRAINER") {
        await db.trainerProfile.update({
            where: { userId },
            data: geoData,
        });
    } else if (role === "GYM") {
        await db.gymProfile.update({
            where: { userId },
            data: geoData,
        });
    }

    return geoData;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const viewer = await db.user.findUnique({
        where: { email: session.user.email },
        select: {
            id: true,
            role: true,
            location: true,
            traineeProfile: { select: { lat: true, lng: true } },
            trainerProfile: { select: { lat: true, lng: true } },
            gymProfile: { select: { lat: true, lng: true } },
        },
    });

    let viewerCoords: { lat: number; lng: number } | null = null;
    const viewerProfileCoords =
        viewer?.traineeProfile ||
        viewer?.trainerProfile ||
        viewer?.gymProfile ||
        null;

    if (viewerProfileCoords?.lat != null && viewerProfileCoords.lng != null) {
        viewerCoords = {
            lat: viewerProfileCoords.lat,
            lng: viewerProfileCoords.lng,
        };
    } else if (viewer?.id && viewer.role && viewer.location?.trim()) {
        try {
            const geocoded = await backfillProfileCoordsFromSignupLocation(
                viewer.id,
                viewer.role as Role,
                viewer.location
            );
            if (geocoded) {
                viewerCoords = {
                    lat: geocoded.lat,
                    lng: geocoded.lng,
                };
            }
        } catch {
            // fall back to browser-provided coordinates on the client if lookup fails
        }
    }

    const gymsNeedingCoords = await db.user.findMany({
        where: {
            role: "GYM",
            gymProfile: {
                is: {
                    OR: [
                        { lat: null },
                        { lng: null },
                    ],
                },
            },
        },
        select: {
            id: true,
            location: true,
            gymProfile: {
                select: {
                    address: true,
                },
            },
        },
    });

    await Promise.all(
        gymsNeedingCoords.map(async (gym) => {
            const address = gym.gymProfile?.address?.trim();
            const fallbackLocation = gym.location?.trim();
            const lookupText = address || fallbackLocation;
            if (!lookupText) return;

            try {
                const geocoded = await geocodeAddress(lookupText);
                if (!geocoded) return;

                await db.gymProfile.update({
                    where: { userId: gym.id },
                    data: {
                        city: geocoded.city,
                        state: geocoded.state,
                        country: geocoded.country,
                        lat: geocoded.lat,
                        lng: geocoded.lng,
                    },
                });
            } catch (error) {
                console.error(`gym map geocode failed for ${gym.id}:`, error);
            }
        })
    );

    const gyms = await db.user.findMany({
        where: {
            role: "GYM",
            ...(viewer?.id ? { id: { not: viewer.id } } : {}),
            gymProfile: {
                is: {
                    lat: { not: null },
                    lng: { not: null },
                },
            },
        },
        select: {
            id: true,
            username: true,
            name: true,
            image: true,
            bio: true,
            searchGalleryImages: {
                select: { url: true },
                orderBy: { createdAt: "desc" },
                take: 18,
            },
            gymProfile: {
                select: {
                    id: true,
                    name: true,
                    address: true,
                    city: true,
                    state: true,
                    country: true,
                    lat: true,
                    lng: true,
                    fee: true,
                    rating: true,
                    clients: true,
                    hiringTrainers: true,
                    website: true,
                    showWebsiteButton: true,
                    bio: true,
                    isVerified: true,
                    amenities: true,
                },
            },
        },
        orderBy: [
            { gymProfile: { name: "asc" } },
            { username: "asc" },
        ],
    });

    const results = gyms
        .filter((gym) => gym.gymProfile?.lat != null && gym.gymProfile?.lng != null)
        .map((gym) => {
            const displayName =
                gym.gymProfile?.name?.trim() ||
                gym.name?.trim() ||
                gym.username?.trim() ||
                "Gym";

            return {
            id: gym.id,
            username: gym.username,
            name: displayName,
            image: gym.image,
            gymProfile: {
                id: gym.gymProfile!.id,
                name: displayName,
                address: gym.gymProfile!.address,
                city: gym.gymProfile!.city,
                state: gym.gymProfile!.state,
                country: gym.gymProfile!.country,
                lat: gym.gymProfile!.lat!,
                lng: gym.gymProfile!.lng!,
                fee: gym.gymProfile!.fee,
                rating: gym.gymProfile!.rating,
                clients: gym.gymProfile!.clients,
                hiringTrainers: gym.gymProfile!.hiringTrainers,
                website: gym.gymProfile!.website,
                showWebsiteButton: gym.gymProfile!.showWebsiteButton,
                bio: gym.gymProfile!.bio,
                isVerified: gym.gymProfile!.isVerified,
                amenities: gym.gymProfile!.amenities ?? [],
            },
            about: gym.bio ?? gym.gymProfile!.bio ?? null,
            gallery: gym.searchGalleryImages.map((image) => image.url),
        };
        });

    return NextResponse.json({
        gyms: results,
        viewerCoords,
        viewerHasCoords: Boolean(viewerCoords),
    });
}

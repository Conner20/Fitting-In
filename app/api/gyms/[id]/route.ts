import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { cleanGymInput, userCanEditGym, validateCompleteGymInput } from "@/lib/gyms";
import { db } from "@/prisma/client";
import type { Prisma } from "@prisma/client";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
    const { id } = await params;
    const gym = await db.gym.findFirst({
        where: { id, isPublished: true },
        select: { id: true, slug: true, name: true, address: true, phone: true, website: true, isVerified: true, isPublished: true, gymType: true, dayPassPrice: true, dayPassDetails: true, dayPassUrl: true, city: true, state: true, country: true, lat: true, lng: true, amenities: true, equipment: true, hours: true, contactEmail: true, coverPhotoUrl: true, photoUrls: true, _count: { select: { access: true } } },
    });
    if (!gym) return NextResponse.json({ message: "Gym not found." }, { status: 404 });
    const { _count, ...profile } = gym;
    return NextResponse.json({ gym: { ...profile, isClaimed: profile.isVerified } });
}

export async function PATCH(req: Request, { params }: Context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { id: true } });
    if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });
    const { id } = await params;
    if (!(await userCanEditGym(user.id, id))) return NextResponse.json({ message: "You do not have access to manage this gym." }, { status: 403 });
    const current = await db.gym.findUnique({ where: { id }, select: { name: true, address: true } });
    if (!current) return NextResponse.json({ message: "Gym not found." }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const input = cleanGymInput({ ...body, name: body.name ?? current.name, address: body.address ?? current.address });
    const missing = validateCompleteGymInput({ ...body, name: body.name ?? current.name, address: body.address ?? current.address }, input);
    if (missing.length) return NextResponse.json({ message: `Complete these required fields: ${missing.join(", ")}.` }, { status: 400 });
    const { isPublished: _isPublished, ...editable } = input;
    const claim = await db.gymClaim.upsert({
        where: { gymId_claimantId: { gymId: id, claimantId: user.id } },
        create: { gymId: id, claimantId: user.id, status: "PENDING", businessRole: "Gym representative", evidence: "Listing changes submitted by the gym account.", proposedData: editable as Prisma.InputJsonValue },
        update: { status: "PENDING", evidence: "Listing changes submitted by the gym account.", proposedData: editable as Prisma.InputJsonValue, reviewNote: null, reviewedAt: null, reviewedById: null },
    });
    return NextResponse.json({ claim, message: "Thanks — your changes have been submitted and are awaiting admin approval." });
}

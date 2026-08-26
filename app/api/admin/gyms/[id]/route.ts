import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { cleanGymInput, validateCompleteGymInput } from "@/lib/gyms";
import { db } from "@/prisma/client";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const gym = await db.gym.findUnique({ where: { id }, include: { _count: { select: { access: true } }, claims: { where: { status: "PENDING" }, select: { id: true, proposedData: true }, orderBy: { updatedAt: "desc" }, take: 1 }, invites: { select: { id: true, proposedData: true }, orderBy: { createdAt: "desc" }, take: 10 } } });
    if (!gym) return NextResponse.json({ message: "Gym not found." }, { status: 404 });
    const pendingClaim = gym.claims[0];
    const pendingInvite = !gym.isVerified ? gym.invites.find((invite) => Boolean(invite.proposedData)) : undefined;
    const pendingData = pendingClaim?.proposedData ?? pendingInvite?.proposedData;
    const proposed = pendingData && typeof pendingData === "object" && !Array.isArray(pendingData) ? pendingData : {};
    return NextResponse.json({ gym: { ...gym, ...proposed, pendingClaimId: pendingClaim?.id ?? null, pendingInviteId: pendingInvite?.id ?? null, isClaimed: gym.isVerified && gym._count.access > 0 } });
}

export async function PATCH(req: Request, { params }: Context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data = cleanGymInput(body);
    const missing = validateCompleteGymInput(body, data);
    if (missing.length) return NextResponse.json({ message: `Complete these required fields: ${missing.join(", ")}.` }, { status: 400 });
    if (typeof body.approveInviteId === "string") {
        const invite = await db.gymInvite.findFirst({ where: { id: body.approveInviteId, gymId: id }, select: { id: true, proposedData: true } });
        if (!invite?.proposedData) return NextResponse.json({ message: "Pending verification submission not found." }, { status: 404 });
        const { isPublished: _isPublished, ...approved } = data;
        const gym = await db.gym.update({ where: { id }, data: { ...approved, isVerified: true } });
        return NextResponse.json({ gym, message: "Gym listing approved." });
    }
    const gym = await db.gym.update({ where: { id }, data });
    return NextResponse.json({ gym });
}

export async function DELETE(_req: Request, { params }: Context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await db.gym.delete({ where: { id } });
    return NextResponse.json({ message: "Gym listing deleted." });
}

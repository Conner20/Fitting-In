import { sha256Hex } from "@/lib/token";
import { db } from "@/prisma/client";

export const PENDING_GYM_INVITE_COOKIE = "fittingin_pending_gym_invite";
export const PENDING_GYM_INVITE_MAX_AGE = 60 * 60 * 24 * 14;

export async function getValidPendingGymInvite(rawToken?: string | null) {
    const token = rawToken?.trim();
    if (!token) return "";

    const invite = await db.gymInvite.findUnique({
        where: { tokenHash: sha256Hex(token) },
        select: {
            usedAt: true,
            expiresAt: true,
            gym: { select: { _count: { select: { access: true } } } },
        },
    });

    if (!invite || invite.usedAt || invite.expiresAt <= new Date() || invite.gym._count.access > 0) return "";
    return token;
}

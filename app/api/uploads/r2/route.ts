import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
    ALLOWED_IMAGE_TYPES,
    createR2ObjectKey,
    createR2UploadUrl,
    deleteR2Object,
    isR2Configured,
    r2PublicUrl,
} from "@/lib/r2";
import { db } from "@/prisma/client";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 10;
const ALLOWED_PURPOSES = new Set(["posts", "avatars"]);

async function currentUserId() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    return user?.id ?? null;
}

export async function POST(req: Request) {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!isR2Configured) {
        return NextResponse.json({ message: "Media storage is not configured." }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    const purpose = String(body?.purpose ?? "");
    const files = Array.isArray(body?.files) ? body.files : [];
    if (!ALLOWED_PURPOSES.has(purpose)) {
        return NextResponse.json({ message: "Invalid upload purpose." }, { status: 400 });
    }
    if (files.length < 1 || files.length > MAX_FILES_PER_REQUEST) {
        return NextResponse.json({ message: `Upload between 1 and ${MAX_FILES_PER_REQUEST} images.` }, { status: 400 });
    }

    const uploads = [];
    for (const value of files) {
        const contentType = String(value?.type ?? "").toLowerCase();
        const size = Number(value?.size);
        if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
            return NextResponse.json({ message: "Unsupported image format." }, { status: 400 });
        }
        if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
            return NextResponse.json({ message: "Each image must be 16MB or smaller." }, { status: 400 });
        }

        const key = createR2ObjectKey({ userId, purpose, contentType });
        uploads.push({
            key,
            contentType,
            uploadUrl: await createR2UploadUrl(key, contentType),
            publicUrl: r2PublicUrl(key),
        });
    }

    return NextResponse.json({ uploads });
}

export async function DELETE(req: Request) {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const keys: string[] = Array.isArray(body?.keys)
        ? body.keys.map((key: unknown) => String(key)).slice(0, MAX_FILES_PER_REQUEST)
        : [];
    const userPrefix = `users/${userId}/`;
    if (!keys.length || keys.some((key) => !key.startsWith(userPrefix) || key.includes(".."))) {
        return NextResponse.json({ message: "Invalid object keys." }, { status: 400 });
    }

    await Promise.all(keys.map((key) => deleteR2Object(key)));
    return NextResponse.json({ deleted: keys.length });
}

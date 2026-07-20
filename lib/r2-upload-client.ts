"use client";

export type R2ClientUpload = {
    key: string;
    publicUrl: string;
};

export async function uploadImagesToR2(files: File[], purpose: "posts" | "avatars") {
    if (!files.length) return [];
    const presignResponse = await fetch("/api/uploads/r2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            purpose,
            files: files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
        }),
    });
    const data = await presignResponse.json().catch(() => ({}));
    if (!presignResponse.ok || !Array.isArray(data?.uploads)) {
        throw new Error(data?.message || "Unable to prepare image upload.");
    }

    const completed: R2ClientUpload[] = [];
    try {
        for (let index = 0; index < files.length; index += 1) {
            const file = files[index];
            const upload = data.uploads[index];
            const response = await fetch(upload.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": upload.contentType },
                body: file,
            });
            if (!response.ok) throw new Error(`Image upload failed (${response.status}).`);
            completed.push({ key: upload.key, publicUrl: upload.publicUrl });
        }
        return completed;
    } catch (error) {
        await cleanupR2Uploads(completed.map((upload) => upload.key));
        throw error;
    }
}

export async function cleanupR2Uploads(keys: string[]) {
    if (!keys.length) return;
    await fetch("/api/uploads/r2", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
    }).catch(() => undefined);
}

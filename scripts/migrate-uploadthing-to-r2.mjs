import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { UTApi } from "uploadthing/server";

for (const envFile of [".env.local", ".env"]) {
    if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const apply = process.argv.includes("--apply");
const manifestPath = "uploadthing-r2-migration-manifest.json";
const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_BASE_URL",
];

for (const name of required) {
    if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const db = new PrismaClient();
const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});
const bucket = process.env.R2_BUCKET_NAME;
const publicBase = process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");

function isUploadThingUrl(value) {
    if (typeof value !== "string" || !value) return false;
    try {
        const hostname = new URL(value).hostname.toLowerCase();
        return hostname.endsWith("utfs.io") || hostname.endsWith("ufs.sh") || hostname.includes("uploadthing");
    } catch {
        return false;
    }
}

function uploadThingKey(url) {
    try {
        return decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "");
    } catch {
        return "";
    }
}

function safeFilename(url, contentType) {
    const fromUrl = basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, "-").slice(-160);
    if (fromUrl.includes(".")) return fromUrl;
    const extensions = {
        "image/avif": "avif",
        "image/gif": "gif",
        "image/heic": "heic",
        "image/heif": "heif",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    };
    return `${fromUrl || "image"}.${extensions[contentType] || "bin"}`;
}

async function loadReferences() {
    const [users, posts, announcements, galleries, messages] = await Promise.all([
        db.user.findMany({ where: { image: { not: null } }, select: { id: true, image: true } }),
        db.post.findMany({ select: { id: true, imageUrl: true, imageUrls: true } }),
        db.announcement.findMany({ select: { id: true, imageUrl: true, imageUrls: true } }),
        db.searchGalleryImage.findMany({ select: { id: true, url: true } }),
        db.message.findMany({ select: { id: true, imageUrls: true } }),
    ]);

    const urls = new Set();
    const add = (value) => {
        if (isUploadThingUrl(value)) urls.add(value);
    };
    users.forEach((row) => add(row.image));
    posts.forEach((row) => { add(row.imageUrl); row.imageUrls.forEach(add); });
    announcements.forEach((row) => { add(row.imageUrl); row.imageUrls.forEach(add); });
    galleries.forEach((row) => add(row.url));
    messages.forEach((row) => row.imageUrls.forEach(add));

    return { users, posts, announcements, galleries, messages, urls: [...urls] };
}

async function listUploadThingFiles() {
    if (!process.env.UPLOADTHING_TOKEN && !process.env.UPLOADTHING_SECRET) return [];
    const api = new UTApi();
    const files = [];
    let offset = 0;
    while (true) {
        const page = await api.listFiles({ limit: 500, offset });
        files.push(...page.files);
        if (!page.hasMore) break;
        offset += page.files.length;
    }
    return files;
}

function existingManifest() {
    if (!existsSync(manifestPath)) return new Map();
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
    return new Map((parsed.files || []).map((item) => [item.oldUrl, item]));
}

function saveManifest(items) {
    writeFileSync(
        manifestPath,
        `${JSON.stringify({ generatedAt: new Date().toISOString(), files: [...items.values()] }, null, 2)}\n`,
    );
}

async function copyAndVerify(oldUrl) {
    const response = await fetch(oldUrl);
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    const contentType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0];
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength) throw new Error("Source file is empty");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const key = `legacy/uploadthing/${sha256.slice(0, 16)}-${safeFilename(oldUrl, contentType)}`;

    await r2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        Metadata: { sha256, source: "uploadthing" },
    }));
    const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (Number(head.ContentLength) !== bytes.byteLength) throw new Error("R2 size verification failed");
    if (head.Metadata?.sha256 !== sha256) throw new Error("R2 checksum metadata verification failed");

    return {
        oldUrl,
        newUrl: `${publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`,
        key,
        size: bytes.byteLength,
        sha256,
        contentType,
        status: "verified",
    };
}

const replace = (value, mappings) => (value && mappings.get(value)?.newUrl) || value;

async function updateDatabase(data, mappings) {
    const operations = [];
    for (const row of data.users) {
        const image = replace(row.image, mappings);
        if (image !== row.image) operations.push(db.user.update({ where: { id: row.id }, data: { image } }));
    }
    for (const row of data.posts) {
        const imageUrl = replace(row.imageUrl, mappings);
        const imageUrls = row.imageUrls.map((url) => replace(url, mappings));
        if (imageUrl !== row.imageUrl || imageUrls.some((url, i) => url !== row.imageUrls[i])) {
            operations.push(db.post.update({ where: { id: row.id }, data: { imageUrl, imageUrls } }));
        }
    }
    for (const row of data.announcements) {
        const imageUrl = replace(row.imageUrl, mappings);
        const imageUrls = row.imageUrls.map((url) => replace(url, mappings));
        if (imageUrl !== row.imageUrl || imageUrls.some((url, i) => url !== row.imageUrls[i])) {
            operations.push(db.announcement.update({ where: { id: row.id }, data: { imageUrl, imageUrls } }));
        }
    }
    for (const row of data.galleries) {
        const url = replace(row.url, mappings);
        if (url !== row.url) operations.push(db.searchGalleryImage.update({ where: { id: row.id }, data: { url } }));
    }
    for (const row of data.messages) {
        const imageUrls = row.imageUrls.map((url) => replace(url, mappings));
        if (imageUrls.some((url, i) => url !== row.imageUrls[i])) {
            operations.push(db.message.update({ where: { id: row.id }, data: { imageUrls } }));
        }
    }
    for (let index = 0; index < operations.length; index += 100) {
        await db.$transaction(operations.slice(index, index + 100));
    }
    return operations.length;
}

try {
    const data = await loadReferences();
    const uploadThingFiles = await listUploadThingFiles();
    const referencedKeys = new Set(data.urls.map(uploadThingKey).filter(Boolean));
    const orphaned = uploadThingFiles.filter((file) => !referencedKeys.has(file.key));

    console.log(`Referenced UploadThing URLs: ${data.urls.length}`);
    console.log(`UploadThing files listed: ${uploadThingFiles.length}`);
    console.log(`Potential orphaned UploadThing files: ${orphaned.length}`);

    if (!apply) {
        console.log("Dry run complete. No files or database records were changed.");
        console.log("Run with --apply only after reviewing this inventory and taking a database backup.");
        process.exitCode = 0;
    } else {
        const manifest = existingManifest();
        for (const oldUrl of data.urls) {
            if (manifest.get(oldUrl)?.status === "verified") continue;
            try {
                const migrated = await copyAndVerify(oldUrl);
                manifest.set(oldUrl, migrated);
                console.log(`Verified ${oldUrl} -> ${migrated.newUrl}`);
            } catch (error) {
                manifest.set(oldUrl, { oldUrl, status: "failed", error: error instanceof Error ? error.message : String(error) });
                console.error(`Failed ${oldUrl}:`, error);
            }
            saveManifest(manifest);
        }

        const failures = data.urls.filter((url) => manifest.get(url)?.status !== "verified");
        if (failures.length) throw new Error(`${failures.length} files failed; database URLs were not changed.`);
        const changedRecords = await updateDatabase(data, manifest);
        console.log(`Migration complete. Updated ${changedRecords} database records.`);
        console.log(`Manifest: ${manifestPath}`);
    }
} finally {
    await db.$disconnect();
}

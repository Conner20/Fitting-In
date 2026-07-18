import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { existsSync } from "node:fs";

for (const envFile of [".env.local", ".env"]) {
    if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
for (const name of required) {
    if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});
const key = `smoke-tests/${Date.now()}-codex.txt`;

try {
    await client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: "R2 connection verified",
        ContentType: "text/plain",
    }));
    const head = await client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
    if (Number(head.ContentLength) !== 22) throw new Error("Uploaded smoke-test object had an unexpected size");
    console.log("R2 upload and read verification passed.");
} finally {
    await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key })).catch(() => undefined);
}

console.log("R2 smoke-test object was deleted.");

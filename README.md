# Fitting In

Re-engineering the fitness economy through social media.

## Tech Stack

Next.js (TypeScript), Tailwind CSS, NextAuth.js, PostgreSQL via Prisma, Next.js API Routes, Railway

### Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment variables

Create a `.env.local` (or configure variables in Vercel) containing at least:

```
DATABASE_URL=postgres://...
NEXTAUTH_SECRET=your-secret
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-scoped-r2-access-key
R2_SECRET_ACCESS_KEY=your-scoped-r2-secret-key
R2_BUCKET_NAME=fitting-in-media
R2_PUBLIC_BASE_URL=https://media.example.com
```

Without the Google keys NextAuth disables OAuth and Google sign-in buttons will remain inactive. 

R2 credentials must remain server-only; never prefix them with `NEXT_PUBLIC_`. Browser uploads use
authenticated, short-lived presigned URLs from `/api/uploads/r2`.

### UploadThing to R2 migration

Keep UploadThing configured and all source files intact until migration verification is complete.
The migration tool is dry-run-only by default:

```bash
npm run media:migrate:dry-run
```

It inventories every UploadThing URL referenced by users, posts, announcements, search galleries,
and messages. It also compares those references with the UploadThing file list when UploadThing
credentials are available.

After taking a production database backup and reviewing the inventory, explicitly apply the copy:

```bash
npm run media:migrate:apply
```

The apply command copies each referenced source object to R2, stores a SHA-256 checksum in R2
metadata, verifies the destination size and checksum metadata, and writes a resumable local manifest.
Database URLs are updated only if every referenced file verifies successfully. The manifest is ignored
by Git and must be stored securely with the database backup until the rollback window closes.

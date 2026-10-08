# Fitting In

Find the right gym at the right price.

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
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=metrics-sync@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
CRON_SECRET=a-random-secret-with-at-least-16-characters
```

Without the Google keys NextAuth disables OAuth and Google sign-in buttons will remain inactive. 

R2 credentials must remain server-only; never prefix them with `NEXT_PUBLIC_`. Browser uploads use
authenticated, short-lived presigned URLs from `/api/uploads/r2`.

### Google Sheets metrics sync

The production route `/api/cron/google-sheets` rebuilds one filterable `Fitting In Metrics` sheet from PostgreSQL. Its `Section` column identifies the original dataset, and all underlying records remain available in the consolidated table. The Sheet is a one-way reporting copy: editing it never changes application data, and edits to the managed sheet are replaced at the next sync. The service-account email must have Editor access to the spreadsheet; human viewers can be granted Viewer access. Vercel Hobby runs a free daily fallback at 04:00 UTC. The free Cloudflare Worker in `cloudflare/` calls the same protected route every 15 minutes.

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

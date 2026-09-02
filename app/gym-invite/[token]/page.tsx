import AdminGymListingEditor from "@/components/AdminGymListingEditor";
import Link from "next/link";
import { sha256Hex } from "@/lib/token";
import { db } from "@/prisma/client";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ claim?: string }> };

export default async function GymInvitePage({ params, searchParams }: Props) {
    const { token } = await params;
    const { claim } = await searchParams;
    const invite = await db.gymInvite.findUnique({
        where: { tokenHash: sha256Hex(token) },
        include: { gym: true },
    });
    if (invite?.gym.isVerified && claim !== "1") return <main className="grid min-h-screen place-items-center bg-zinc-50 p-6 text-zinc-950 dark:bg-neutral-950 dark:text-white"><div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/5"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#22c55e]/15 text-2xl text-[#22c55e]">✓</div><h1 className="mt-5 text-2xl font-black">Listing already verified</h1><p className="mt-3 text-sm leading-6 text-zinc-500">The listing for {invite.gym.name} has already been verified. No additional verification is required.</p><Link href="/" className="mt-6 inline-flex rounded-full bg-[#22c55e] px-5 py-3 text-sm font-black text-black transition hover:bg-black hover:text-[#22c55e]">Explore Fitting In</Link></div></main>;
    if (!invite || invite.usedAt || invite.expiresAt <= new Date()) return <main className="grid min-h-screen place-items-center bg-zinc-50 p-6 dark:bg-neutral-950"><div className="max-w-md rounded-3xl border bg-white p-8 text-center dark:border-white/10 dark:bg-white/5"><h1 className="text-2xl font-bold">Invitation unavailable</h1><p className="mt-3 text-sm text-zinc-500">This gym invitation is invalid, expired, or has already been used.</p><Link href="/" className="mt-6 inline-flex rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Explore Fitting In</Link></div></main>;
    const gym = invite.gym;
    const initialGym = {
        id: gym.id, name: gym.name, address: gym.address, city: gym.city, state: gym.state, country: gym.country,
        lat: gym.lat, lng: gym.lng, phone: gym.phone, contactEmail: gym.contactEmail, website: gym.website,
        gymType: gym.gymType, dayPassPrice: gym.dayPassPrice, dayPassDetails: gym.dayPassDetails,
        dayPassUrl: gym.dayPassUrl, membershipPrice: gym.membershipPrice, membershipDetails: gym.membershipDetails,
        membershipOptions: gym.membershipOptions, hours: gym.hours, amenities: gym.amenities, equipment: gym.equipment,
        coverPhotoUrl: gym.coverPhotoUrl,
        photoUrls: gym.photoUrls, isPublished: gym.isPublished,
    };
    return <main className="gym-verification-page min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 dark:bg-neutral-950 dark:text-white"><div className="mx-auto max-w-4xl"><div className="mb-7"><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Fitting In gym verification</p><h1 className="mt-1 text-3xl font-black">Verify your gym info</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Review the prefilled listing and correct anything that is inaccurate. Your changes are saved when you select Verify information.</p></div><AdminGymListingEditor gymId={gym.id} inviteToken={token} initialGym={initialGym} autoClaim={claim === "1"}/></div></main>;
}

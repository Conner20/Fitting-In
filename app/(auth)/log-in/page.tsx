import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import LogInForm from "@/components/form/LogInForm";
import { authOptions } from "@/lib/auth";

const page = async ({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) => {
    const session = await getServerSession(authOptions);
    const requestedCallback = (await searchParams).callbackUrl ?? "";
    const callbackUrl = requestedCallback.startsWith("/") && !requestedCallback.startsWith("//") ? requestedCallback : "/";
    if (session?.user) {
        redirect(callbackUrl);
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#070907] px-4 py-10">
            <div className="w-full max-w-sm space-y-6 rounded-3xl border border-white/10 bg-[#111411] p-6 shadow-2xl shadow-black/40">
                <LogInForm />
                <div className="text-center">
                    <Link
                        href="/"
                        className="text-sm text-white/45 transition hover:text-[#22c55e]"
                    >
                        ← Back
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default page;

"use client";

import { ChangeEvent, DragEvent, FormEvent, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, X } from "lucide-react";
import GymHoursEditor from "@/components/GymHoursEditor";

type FormState = {
    name: string; address: string; city: string; state: string; country: string; lat: number | null; lng: number | null; phone: string; contactEmail: string;
    website: string; gymType: string; dayPassPrice: string; dayPassDetails: string; dayPassUrl: string;
    hours: string; amenities: string; equipment: string; coverPhotoUrl: string; photoUrls: string[];
    isPublished: boolean;
};

const empty: FormState = { name: "", address: "", city: "", state: "", country: "", lat: null, lng: null, phone: "", contactEmail: "", website: "", gymType: "", dayPassPrice: "", dayPassDetails: "", dayPassUrl: "", hours: "", amenities: "", equipment: "", coverPhotoUrl: "", photoUrls: [], isPublished: true };
type AddressSuggestion = { id: string; label: string; lat: number; lng: number; city?: string; state?: string; country?: string };
const lines = (value: string) => value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
const AMENITY_OPTIONS = ["Sauna", "Steam room", "Pool", "Showers", "Locker rooms", "Basketball court", "Turf area", "Group classes", "Personal training", "Childcare", "Parking", "24/7 access", "Women's-only area"];
const EQUIPMENT_OPTIONS = ["Squat rack", "Power rack", "Smith machine", "Bench press", "Deadlift platform", "Olympic lifting platform", "Hack squat", "Pendulum squat", "Belt squat", "Leg press", "Cable station", "Pec deck", "Hip thrust machine", "Dumbbells 100+ lb", "Dumbbells 120+ lb", "Dumbbells 150+ lb"];
const GYM_TYPE_OPTIONS = ["Open", "Personal training gym", "Group training gym", "Specialty gym/studio"];
const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};
const normalizeDayPassDays = (value: unknown) => {
    const raw = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
    if (!raw) return "";
    const numeric = Number(raw);
    if (Number.isInteger(numeric) && numeric > 0) return String(numeric);
    const words: Record<string, string> = { single: "1", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7" };
    return Object.entries(words).find(([word]) => raw.toLowerCase().includes(word))?.[1] ?? "1";
};

export default function AdminGymListingEditor({ gymId, inviteToken, initialGym, autoClaim = false, ownerMode = false }: { gymId?: string; inviteToken?: string; initialGym?: Record<string, any>; autoClaim?: boolean; ownerMode?: boolean }) {
    const router = useRouter();
    const [form, setForm] = useState<FormState>(empty);
    const [loading, setLoading] = useState(Boolean(gymId && !initialGym));
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [draggingOver, setDraggingOver] = useState<"cover" | "amenities" | null>(null);
    const [message, setMessage] = useState("");
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
    const [addressOpen, setAddressOpen] = useState(false);
    const [needsAccount, setNeedsAccount] = useState(false);
    const [verificationComplete, setVerificationComplete] = useState<"guest" | "user" | null>(null);
    const [updatedFeedback, setUpdatedFeedback] = useState(false);
    const updatedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoClaimStarted = useRef(false);

    useEffect(() => () => { if (updatedTimer.current) clearTimeout(updatedTimer.current); }, []);

    useEffect(() => {
        if (!inviteToken || !autoClaim || autoClaimStarted.current) return;
        autoClaimStarted.current = true; setSaving(true);
        fetch(`/api/gym-invites/${encodeURIComponent(inviteToken)}/claim`, { method: "POST" }).then(async (response) => {
            const result = await response.json().catch(() => ({}));
            if (response.ok) window.location.replace("/");
            else setMessage(result.message ?? "Unable to submit your claim.");
        }).finally(() => setSaving(false));
    }, [autoClaim, inviteToken]);

    function populate(gym: Record<string, any>) {
        setForm({
            name: gym.name ?? "", address: gym.address ?? "", city: gym.city ?? "", state: gym.state ?? "", country: gym.country ?? "", lat: gym.lat ?? null, lng: gym.lng ?? null, phone: formatPhone(gym.phone ?? ""), contactEmail: gym.contactEmail ?? "", website: gym.website ?? "", gymType: gym.gymType === "Open gym" ? "Open" : gym.gymType ?? "", dayPassPrice: gym.dayPassPrice == null ? "" : String(gym.dayPassPrice), dayPassDetails: normalizeDayPassDays(gym.dayPassDetails), dayPassUrl: gym.dayPassUrl ?? "", hours: gym.hours ?? "", amenities: (gym.amenities ?? []).join("\n"), equipment: (gym.equipment ?? []).join("\n"), coverPhotoUrl: gym.coverPhotoUrl ?? "", photoUrls: gym.photoUrls ?? [], isPublished: gym.isPublished ?? true,
        });
    }

    useEffect(() => {
        if (initialGym) { populate(initialGym); setLoading(false); return; }
        if (!gymId) return;
        fetch(ownerMode ? `/api/gyms/${gymId}` : `/api/admin/gyms/${gymId}`, { cache: "no-store" }).then(async (response) => {
            if (!response.ok) throw new Error("Unable to load gym listing.");
            const { gym } = await response.json();
            populate(gym);
        }).catch((error) => setMessage(error.message)).finally(() => setLoading(false));
    }, [gymId, initialGym, ownerMode]);

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {setForm((current) => ({ ...current, [key]: value }))};

    useEffect(() => {
        const query = form.address.trim();
        if (query.length < 3 || !addressOpen) { setAddressSuggestions([]); return; }
        const timer = window.setTimeout(() => fetch(`/api/landing-geocode?q=${encodeURIComponent(query)}`).then(async (response) => response.ok ? response.json() : { results: [] }).then((data) => setAddressSuggestions(data.results ?? [])).catch(() => setAddressSuggestions([])), 300);
        return () => window.clearTimeout(timer);
    }, [addressOpen, form.address]);

    function selectAddress(suggestion: AddressSuggestion) {
        setForm((current) => ({ ...current, address: suggestion.label, city: suggestion.city || current.city, state: suggestion.state || current.state, country: suggestion.country || current.country, lat: suggestion.lat, lng: suggestion.lng }));
        setAddressSuggestions([]); setAddressOpen(false);
    }

    async function uploadFiles(files: File[], target: "cover" | "amenities") {
        files = files.filter((file) => file.type.startsWith("image/"));
        if (!files.length) return;
        setUploading(true); setMessage("");
        const data = new FormData(); (target === "cover" ? files.slice(0, 1) : files).forEach((file) => data.append("images", file));
        const response = await fetch(inviteToken ? `/api/uploads/images?invite=${encodeURIComponent(inviteToken)}` : "/api/uploads/images", { method: "POST", body: data });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.urls?.length) {
            if (target === "cover") update("coverPhotoUrl", result.urls[0]);
            else setForm((current) => ({ ...current, photoUrls: [...current.photoUrls, ...result.urls] }));
        } else setMessage(result.message ?? "Image upload failed.");
        setUploading(false);
    }

    async function uploadImages(event: ChangeEvent<HTMLInputElement>, target: "cover" | "amenities") {
        await uploadFiles(Array.from(event.target.files ?? []), target);
        event.target.value = "";
    }

    function dropImages(event: DragEvent<HTMLElement>, target: "cover" | "amenities") {
        event.preventDefault();
        setDraggingOver(null);
        if (!uploading) void uploadFiles(Array.from(event.dataTransfer.files), target);
    }

    async function submit(event: FormEvent) {
        event.preventDefault(); setSaving(true); setMessage(""); setValidationErrors([]);
        const errors:string[]=[];
        const required:[string,string][]=[["Gym name",form.name],["Street address",form.address],["City",form.city],["State",form.state],["Country",form.country],["Phone",form.phone],["Email",form.contactEmail],["Website",form.website],["Day pass price",form.dayPassPrice],["Day pass duration",form.dayPassDetails],["Hours",form.hours],["Amenities",form.amenities],["Equipment",form.equipment]];
        required.forEach(([field,value])=>{if(!value.trim())errors.push(`${field} is required.`)});
        if(!GYM_TYPE_OPTIONS.includes(form.gymType))errors.push("Gym type must be selected.");
        if(form.phone&&form.phone.replace(/\D/g,"").length!==10)errors.push("Phone must include 10 digits.");
        if(form.contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))errors.push("Contact email must be a valid email address.");
        if(form.dayPassDetails&&(!/^\d+$/.test(form.dayPassDetails)||Number(form.dayPassDetails)<1))errors.push("Day pass duration must be a whole number of days.");
        if(form.website&&!/^[a-z][a-z\d+.-]*:\/\//i.test(form.website)&&!form.website.includes("."))errors.push("Website must be a valid domain, such as example.com.");
        if(form.lat==null||form.lng==null)errors.push("Street address must be selected from the address suggestions.");
        if(!form.coverPhotoUrl)errors.push("Cover photo is required.");
        if(!form.photoUrls.length)errors.push("At least one amenity photo is required.");
        if(form.dayPassUrl&&!/^[a-z][a-z\d+.-]*:\/\//i.test(form.dayPassUrl)&&!form.dayPassUrl.includes("."))errors.push("Day pass URL must be a valid destination, such as gym.com/day-pass.");
        if(errors.length){setValidationErrors(errors);setSaving(false);if(inviteToken)window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}));return}
        const payload = { ...form, dayPassPrice: form.dayPassPrice, amenities: lines(form.amenities), equipment: lines(form.equipment) };
        if (gymId && !inviteToken) { setUpdatedFeedback(true); if (updatedTimer.current) { clearTimeout(updatedTimer.current); updatedTimer.current = null; } }
        const endpoint = inviteToken ? `/api/gym-invites/${encodeURIComponent(inviteToken)}/claim` : ownerMode ? (gymId ? `/api/gyms/${gymId}` : "/api/user/gyms") : gymId ? `/api/admin/gyms/${gymId}` : "/api/admin/gyms";
        const response = await fetch(endpoint, { method: inviteToken || gymId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const result = await response.json().catch(() => ({}));
        if (response.ok && inviteToken) {
            const claimResponse = await fetch(`/api/gym-invites/${encodeURIComponent(inviteToken)}/claim`, { method: "POST" });
            const claimResult = await claimResponse.json().catch(() => ({}));
            if (claimResponse.ok) setVerificationComplete("user");
            else if (claimResponse.status === 401) { setVerificationComplete("guest"); setNeedsAccount(true); }
            else setMessage(claimResult.message ?? "Information saved, but the claim could not be submitted.");
        }
        else if (response.ok) { if (!gymId) setMessage(result.message ?? "Gym listing created."); if (gymId) updatedTimer.current = setTimeout(() => { setUpdatedFeedback(false); updatedTimer.current = null; }, 2000); if (!gymId && result.gym?.id) router.replace(`/admin/gyms/${result.gym.id}`); }
        else { setUpdatedFeedback(false); setMessage(result.message ?? "Unable to save gym listing."); }
        setSaving(false);
    }

    async function deleteGym() {
        if (!gymId || !window.confirm("Delete this gym listing permanently? This cannot be undone.")) return;
        setSaving(true);
        const response = await fetch(`/api/admin/gyms/${gymId}`, { method: "DELETE" });
        const result = await response.json().catch(() => ({}));
        if (response.ok) router.replace("/admin/gyms");
        else { setMessage(result.message ?? "Unable to delete gym listing."); setSaving(false); }
    }

    if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><span className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" /></div>;
    if (verificationComplete && inviteToken) return <div className="fixed inset-0 z-[5000] grid min-h-screen place-items-center bg-zinc-50 p-5 text-zinc-950 dark:bg-neutral-950 dark:text-white"><div className="w-full max-w-xl rounded-3xl border border-black/10 bg-white p-7 text-center shadow-xl sm:p-10 dark:border-white/10 dark:bg-white/5"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#22c55e]/15 text-[#22c55e]"><Check size={28} strokeWidth={3}/></div><h1 className="mt-5 text-2xl font-black">Thank you!</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-300">{verificationComplete==="guest"?"Your gym information has been verified and the listing is now updated. Create an account to claim this listing and manage it going forward.":"Your gym information has been verified and the listing is now updated."}</p>{verificationComplete==="guest"?<a href={`/sign-up?invite=${encodeURIComponent(inviteToken)}`} className="mt-7 inline-flex rounded-full bg-[#22c55e] px-6 py-3 text-sm font-black text-black">Create an account</a>:<a href="/" className="mt-7 inline-flex rounded-full bg-[#22c55e] px-6 py-3 text-sm font-black text-black">Return to Fitting In</a>}</div></div>;
    const input = "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 dark:border-white/10 dark:bg-black/20";
    const label = "text-sm font-medium text-zinc-700 dark:text-zinc-200";
    return <form noValidate onSubmit={submit} className={`mx-auto max-w-4xl ${validationErrors.length?"gym-listing-validation-active":""}`}>
        <div className="space-y-6">
            {validationErrors.length>0&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><p className="font-semibold">Please correct the following fields:</p><ul className="mt-2 list-disc space-y-1 pl-5">{validationErrors.map(error=><li key={error}>{error}</li>)}</ul></div>}
            {message && <p className={`rounded-xl border p-3 text-sm ${/unable|failed|invalid|required|error/i.test(message)?"border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200":"border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"}`}>{message}</p>}
            {needsAccount && inviteToken && <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950 sm:grid-cols-2"><div className="sm:col-span-2"><h2 className="font-semibold">Maintain this gym profile</h2><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Create a Gym account or log in. Your verified listing changes have already been saved.</p></div><a href={`/sign-up?invite=${encodeURIComponent(inviteToken)}`} className="rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-semibold text-white">Create Gym account</a><a href={`/log-in?callbackUrl=${encodeURIComponent(`/gym-invite/${inviteToken}?claim=1`)}`} className="rounded-xl border border-emerald-700 px-4 py-3 text-center text-sm font-semibold text-emerald-800 dark:text-emerald-300">Log in</a></div>}
            <EditorSection title="Identity and location" description="The basic information people use to find and contact this gym.">
                <Field label="Gym name"><input required className={input} value={form.name} onChange={(e) => update("name", e.target.value)} /></Field>
                <div className="relative"><Field label="Street address"><input required autoComplete="off" className={input} value={form.address} onFocus={() => setAddressOpen(true)} onChange={(e) => { update("address", e.target.value); update("lat", null); update("lng", null); setAddressOpen(true); }} placeholder="Start typing an address…" /></Field>{addressOpen && addressSuggestions.length > 0 && <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-neutral-900">{addressSuggestions.map((suggestion) => <button key={suggestion.id} type="button" onClick={() => selectAddress(suggestion)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-white/10">{suggestion.label}</button>)}</div>}</div>
                <div className="grid gap-3 sm:grid-cols-3"><Field label="City"><input required className={input} value={form.city} onChange={(e) => update("city", e.target.value)} /></Field><Field label="State"><input required className={input} value={form.state} onChange={(e) => update("state", e.target.value)} /></Field><Field label="Country"><input required className={input} value={form.country} onChange={(e) => update("country", e.target.value)} /></Field></div>
                <div className="grid gap-3 sm:grid-cols-2"><Field label="Phone"><input required type="tel" inputMode="numeric" maxLength={14} className={input} value={form.phone} onChange={(e) => update("phone", formatPhone(e.target.value))} placeholder="(202) 555-0123" /></Field><Field label="Email"><input required type="email" className={input} value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} /></Field></div>
                <Field label="Website"><input required type="text" inputMode="url" className={input} value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="example.com" /></Field>
            </EditorSection>
            <EditorSection title="Gym type and day pass" description="Day-pass information is the only pricing shown to visitors and is used for comparison filters.">
                <div className="grid gap-3 sm:grid-cols-2 [&_input]:py-2 [&_select]:py-2 [&_textarea]:py-2">
                    <Field label="Gym type"><select required className={input} value={GYM_TYPE_OPTIONS.includes(form.gymType) ? form.gymType : ""} onChange={(e) => update("gymType", e.target.value)}><option value="" disabled>Select a gym type</option><option value="Open">Open</option><option value="Personal training gym">Personal training gym</option><option value="Group training gym">Group training gym</option><option value="Specialty gym/studio">Specialty gym/studio</option></select></Field>
                    <Field label="Day pass price"><input required type="number" min="0" step="0.01" className={input} value={form.dayPassPrice} onChange={(e) => update("dayPassPrice", e.target.value)} /></Field>
                    <Field label="Day pass URL"><input type="text" inputMode="url" className={input} value={form.dayPassUrl} onChange={(e) => update("dayPassUrl", e.target.value)} placeholder="gym.com/day-pass" /></Field>
                    <Field label="Day pass duration (days)"><input required type="number" inputMode="numeric" min="1" step="1" className={input} value={form.dayPassDetails} onChange={(e) => update("dayPassDetails", e.target.value.replace(/\D/g, ""))} placeholder="1" /></Field>
                </div>
            </EditorSection>
            <EditorSection title="Facility details"><Field label="Hours"><GymHoursEditor value={form.hours} onChange={(value) => update("hours", value)} /></Field><div><h3 className={`text-sm font-medium ${validationErrors.includes("Amenities is required.")&&!form.amenities.trim()?"text-red-500 dark:text-red-400":"text-zinc-700 dark:text-zinc-200"}`}>Amenities</h3><p className="mt-1 text-xs text-zinc-500">Select every amenity available at this gym. These choices power search and membership access.</p><StructuredChecklist options={AMENITY_OPTIONS} selected={lines(form.amenities)} onChange={(items)=>update("amenities",items.join("\n"))} otherLabel="Other amenities" /></div><div><h3 className={`text-sm font-medium ${validationErrors.includes("Equipment is required.")&&!form.equipment.trim()?"text-red-500 dark:text-red-400":"text-zinc-700 dark:text-zinc-200"}`}>Equipment</h3><p className="mt-1 text-xs text-zinc-500">Select all equipment available at this location.</p><StructuredChecklist options={EQUIPMENT_OPTIONS} selected={lines(form.equipment)} onChange={(items)=>update("equipment",items.join("\n"))} otherLabel="Other equipment" /></div></EditorSection>
            <EditorSection title="Photos" description="Add a wide cover photo and photos that showcase the gym's amenities."><label onDragEnter={(event)=>{event.preventDefault();setDraggingOver("cover")}} onDragOver={(event)=>event.preventDefault()} onDragLeave={(event)=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDraggingOver(null)}} onDrop={(event)=>dropImages(event,"cover")} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center text-sm font-medium transition hover:bg-zinc-50 dark:hover:bg-white/5 ${draggingOver==="cover"?"border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]":validationErrors.length&&!form.coverPhotoUrl?"border-red-500 text-red-500 dark:border-red-500 dark:text-red-400":"border-zinc-300 dark:border-white/20"}`}><ImagePlus size={18} />{uploading ? "Uploading…" : form.coverPhotoUrl ? "Replace cover photo" : "Upload cover photo"}<input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => uploadImages(event, "cover")} /></label>{form.coverPhotoUrl&&<PhotoRemovalPreview label="Cover photo" url={form.coverPhotoUrl} remove={()=>update("coverPhotoUrl","")}/>}<details><summary className="cursor-pointer text-xs text-zinc-500">Or enter a cover photo URL</summary><div className="mt-3"><Field label="Cover photo URL"><input className={input} value={form.coverPhotoUrl} onChange={(e) => update("coverPhotoUrl", e.target.value)} /></Field></div></details><label onDragEnter={(event)=>{event.preventDefault();setDraggingOver("amenities")}} onDragOver={(event)=>event.preventDefault()} onDragLeave={(event)=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDraggingOver(null)}} onDrop={(event)=>dropImages(event,"amenities")} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center text-sm font-medium transition hover:bg-zinc-50 dark:hover:bg-white/5 ${draggingOver==="amenities"?"border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]":validationErrors.length&&!form.photoUrls.length?"border-red-500 text-red-500 dark:border-red-500 dark:text-red-400":"border-zinc-300 dark:border-white/20"}`}><ImagePlus size={18} />{uploading ? "Uploading…" : "Upload amenity photos"}<input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(event)=>uploadImages(event,"amenities")} /></label><div className="grid grid-cols-3 gap-2">{form.photoUrls.map((url) => <div key={url} className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-100"><img src={url} alt="" className="h-full w-full object-cover" /><button type="button" aria-label="Remove amenity photo" onClick={() => update("photoUrls", form.photoUrls.filter((item) => item !== url))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"><X size={13} /></button></div>)}</div></EditorSection>
            {inviteToken ? <div className="flex justify-center py-2 pb-[max(.5rem,env(safe-area-inset-bottom))]"><button disabled={saving} className="verify-information-button min-w-52 rounded-xl border border-transparent bg-[#22c55e] px-7 py-3 text-sm font-black text-[#111411] transition hover:border-[#22c55e] hover:bg-black hover:text-[#22c55e] disabled:opacity-50">{saving ? "Saving…" : "Verify information"}</button></div> : <div className="flex flex-wrap items-center justify-center gap-3 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">{!gymId&&!ownerMode&&<button type="button" onClick={()=>router.push("/admin/gyms")} className="gym-owner-back-button rounded-xl border border-zinc-300 bg-transparent px-6 py-2.5 text-sm font-black text-zinc-700 transition hover:border-white hover:text-white dark:border-white/20 dark:text-white/75">Back</button>}{ownerMode&&<button type="button" onClick={()=>router.push("/")} className="gym-owner-back-button rounded-xl border border-zinc-300 bg-transparent px-6 py-2.5 text-sm font-black text-zinc-700 transition hover:border-white hover:text-white dark:border-white/20 dark:text-white/75">Back</button>}{gymId&&!ownerMode&&<button type="button" onClick={()=>router.push("/admin/gyms")} className="gym-owner-back-button rounded-xl border border-zinc-300 bg-transparent px-6 py-2.5 text-sm font-black text-zinc-700 transition hover:border-white hover:text-white dark:border-white/20 dark:text-white/75">Back</button>}{gymId && !ownerMode && <button type="button" onClick={deleteGym} disabled={saving||updatedFeedback} className="rounded-xl border border-transparent bg-[#e66b6b] px-5 py-2.5 text-sm font-black text-[#111411] transition hover:border-[#e66b6b] hover:bg-zinc-50 hover:text-[#e66b6b] dark:hover:bg-neutral-950">Delete listing</button>}<button disabled={saving} className="rounded-xl border border-transparent bg-[#22c55e] px-6 py-2.5 text-sm font-black text-[#111411] transition hover:border-[#22c55e] hover:bg-zinc-50 hover:text-[#22c55e] disabled:cursor-default dark:hover:bg-neutral-950">{updatedFeedback?<span className="flex animate-[copy-confirm_.35s_ease-out] items-center gap-2"><Check size={16} strokeWidth={3}/>Updated!</span>:saving?"Saving…":gymId?"Submit changes":"Create listing"}</button></div>}
        </div>
    </form>;
}

function StructuredChecklist({options,selected,onChange,otherLabel}:{options:string[];selected:string[];onChange:(items:string[])=>void;otherLabel:string}){const normalizedOptions=new Set(options.map(option=>option.toLowerCase()));const custom=selected.filter(item=>!normalizedOptions.has(item.toLowerCase()));const toggle=(option:string)=>onChange(selected.some(item=>item.toLowerCase()===option.toLowerCase())?selected.filter(item=>item.toLowerCase()!==option.toLowerCase()):[...selected,option]);return <div className="mt-2 space-y-3"><div className="grid gap-2 sm:grid-cols-2">{options.map(option=>{const checked=selected.some(item=>item.toLowerCase()===option.toLowerCase());return <label key={option} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition ${checked?"border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950":"border-zinc-200 bg-white dark:border-white/10 dark:bg-white/5"}`}><input type="checkbox" checked={checked} onChange={()=>toggle(option)} className="h-4 w-4 accent-[#22c55e]"/><span>{option}</span></label>})}<label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition ${custom.length?"border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950":"border-zinc-200 bg-white dark:border-white/10 dark:bg-white/5"}`}><input type="checkbox" checked={custom.length>0} onChange={(event)=>onChange(event.target.checked?[...selected,"Other"]:selected.filter(item=>normalizedOptions.has(item.toLowerCase())))} className="h-4 w-4 accent-[#22c55e]"/><span>{otherLabel}</span></label></div>{custom.length>0&&<textarea required rows={2} value={custom.filter(item=>item!=="Other").join("\n")} onChange={(event)=>onChange([...selected.filter(item=>normalizedOptions.has(item.toLowerCase())),...lines(event.target.value)])} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-white/10 dark:bg-zinc-900" placeholder="Enter one custom item per line"/>}</div>}
function EditorSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) { return <section className="space-y-4 rounded-2xl border border-black/10 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-white/5"><div><h2 className="text-lg font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}</div>{children}</section>; }
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { const content=label==="Pricing details"&&isValidElement(children)?cloneElement(children as React.ReactElement<{required?:boolean}>,{required:false}):children;return <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}{label==="Pricing details"&&<span className="ml-2 text-xs font-normal text-zinc-400">Optional</span>}{hint && <span className="ml-2 text-xs font-normal text-zinc-400">{hint}</span>}{content}</label>; }
function PhotoRemovalPreview({label,url,remove}:{label:string;url:string;remove:()=>void}){return <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-white/5"><img src={url} alt={label} className="h-28 w-full object-cover"/><span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">{label}</span><button type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={remove} className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white transition hover:bg-red-600"><X size={15}/></button></div>}

"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const inputClass = "min-w-0 w-full rounded-xl border border-white/15 bg-white/[.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#22c55e]";

export default function ContactForm() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  useEffect(() => { if (session?.user?.email) setEmail(session.user.email); }, [session?.user?.email]);
  const clearInvalid = (name: string, valid: boolean) => {
    if (!valid) return;
    setInvalidFields(current => { if (!current.has(name)) return current; const next = new Set(current); next.delete(name); return next; });
  };
  const fieldClass = (name: string, extra = "") => `${inputClass} ${invalidFields.has(name) ? "!border-red-500 focus:!border-red-500" : ""} ${extra}`;
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const firstName = String(form.get("firstName") || "").trim();
    const lastName = String(form.get("lastName") || "").trim();
    const message = String(form.get("message") || "").trim();
    const invalid = new Set<string>();
    if (!firstName) invalid.add("firstName");
    if (!lastName) invalid.add("lastName");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) invalid.add("email");
    if (!message) invalid.add("message");
    setInvalidFields(invalid);
    if (invalid.size) return;
    setStatus("sending");
    const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.get("firstName"), lastName: form.get("lastName"), email, message: form.get("message"), website: form.get("website") }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setStatus("idle"); setError(data.error || "Your message could not be sent."); return; }
    formElement.reset(); if (session?.user?.email) setEmail(session.user.email); setStatus("sent");
  };
  if (status === "sent") return <div className="rounded-2xl border border-white/10 bg-[#111411]/90 p-8 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#22c55e] text-xl font-bold text-black">✓</div><h2 className="mt-4 text-xl font-semibold text-white">Thanks for reaching out!</h2><p className="mt-2 text-sm text-white/60">Your message is on its way. We&apos;ll get back to you as soon as we can.</p><button id="contact-send-another-message" type="button" onClick={() => setStatus("idle")} className="contact-send-button mt-5 h-9 rounded-full border border-[#22c55e] bg-[#22c55e] px-5 text-[.78rem] font-bold text-black">Send another message</button></div>;
  return <form noValidate onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-[#111411]/90 p-5 sm:rounded-3xl sm:p-8">
    <div><h2 className="text-lg font-semibold text-white">Send us a message</h2></div>
    <div className="grid grid-cols-2 gap-3 sm:gap-4"><input aria-label="First name" aria-invalid={invalidFields.has("firstName")} name="firstName" required maxLength={80} autoComplete="given-name" placeholder="Your first name" onInput={event => clearInvalid("firstName", event.currentTarget.value.trim().length > 0)} className={fieldClass("firstName")}/><input aria-label="Last name" aria-invalid={invalidFields.has("lastName")} name="lastName" required maxLength={80} autoComplete="family-name" placeholder="Your last name" onInput={event => clearInvalid("lastName", event.currentTarget.value.trim().length > 0)} className={fieldClass("lastName")}/></div>
    <input aria-label="Email" aria-invalid={invalidFields.has("email")} name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={event => { setEmail(event.target.value); clearInvalid("email", /^\S+@\S+\.\S+$/.test(event.target.value.trim())); }} className={fieldClass("email")}/>
    <textarea aria-label="Message" aria-invalid={invalidFields.has("message")} name="message" required maxLength={5000} rows={8} placeholder="Tell us what&apos;s on your mind…" onInput={event => clearInvalid("message", event.currentTarget.value.trim().length > 0)} className={fieldClass("message", "resize-y")}/>
    <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true"/>
    {error && <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
    <button id="contact-send-message" type="submit" disabled={status === "sending"} className="contact-send-button h-10 w-full rounded-full border border-[#22c55e] bg-[#22c55e] px-5 text-sm font-black text-black transition hover:bg-[#111411] hover:text-[#22c55e] disabled:cursor-wait disabled:opacity-60">{status === "sending" ? "Sending…" : "Send message"}</button>
  </form>;
}

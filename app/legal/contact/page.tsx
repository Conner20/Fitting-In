import ContactForm from "@/components/ContactForm";
import LandingHeader from "@/components/LandingHeader";
import LegalTabs from "@/components/LegalTabs";

export default function ContactPage() {
  return <div className="min-h-screen bg-[#070907] text-white"><LandingHeader/><LegalTabs/><main className="px-4 py-9 sm:py-14"><div className="mx-auto max-w-3xl space-y-7"><header className="border-b border-white/10 pb-7"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Contact Us</h1></header><ContactForm/></div></main></div>;
}

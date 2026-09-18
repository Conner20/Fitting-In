"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Your new password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your new password"),
}).refine(values => values.newPassword === values.confirmPassword, {
  message: "The new passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;
type SubmitState = "idle" | "loading" | "updated";

const inputClass = "border border-white/10 bg-white/[.06] text-white placeholder:text-white/35 focus-visible:border-[#22c55e] focus-visible:ring-[#22c55e]/20";

export default function ChangePasswordClient() {
  const [status, setStatus] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to change your password right now.");

      form.reset();
      setStatus("updated");
    } catch (error) {
      setStatus("idle");
      setErrorMessage(error instanceof Error ? error.message : "Unable to change your password right now.");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#070907] px-4 py-10 text-white">
      <div className="w-full max-w-sm space-y-6 rounded-3xl border border-white/10 bg-[#111411] p-6 shadow-2xl shadow-black/40">
        <Form {...form}>
          <h1 className="mb-6 text-center text-3xl text-white">Change Password</h1>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
            {errorMessage && (
              <Alert className="mb-4 border border-red-400/35 bg-red-950/45 text-red-100 shadow-none">
                <AlertTitle className="text-red-200">Unable to change password</AlertTitle>
                <AlertDescription className="text-red-100/90">{errorMessage}</AlertDescription>
              </Alert>
            )}
            {status === "updated" && (
              <Alert className="mb-4 border-[#22c55e]/35 bg-[#22c55e]/10 text-white shadow-none">
                <AlertTitle className="font-bold text-[#86efac]">Password updated</AlertTitle>
                <AlertDescription className="text-white/65">Your new password is ready to use.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <FormField control={form.control} name="currentPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-2 text-white">Current password</FormLabel>
                  <FormControl><PasswordInput placeholder="Enter your current password" autoComplete="current-password" className={inputClass} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-2 text-white">New password</FormLabel>
                  <FormControl><PasswordInput placeholder="Enter your new password" autoComplete="new-password" className={inputClass} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-2 text-white">Confirm new password</FormLabel>
                  <FormControl><PasswordInput placeholder="Confirm your new password" autoComplete="new-password" className={inputClass} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button
              type="submit"
              disabled={status === "loading"}
              style={{ backgroundColor: "#22c55e", color: "#111411", WebkitTapHighlightColor: "transparent" }}
              onPointerDown={event => {
                event.currentTarget.style.setProperty("background", "#22c55e", "important");
                event.currentTarget.style.setProperty("background-color", "#22c55e", "important");
                event.currentTarget.style.setProperty("color", "#111411", "important");
                event.currentTarget.style.setProperty("opacity", "1", "important");
              }}
              className="auth-primary-action change-password-submit mt-6 w-full bg-[#22c55e] font-bold text-black hover:bg-[#19a94e]"
            >
              {status === "loading" ? "Updating…" : "Change password"}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <Link href="/" className="text-sm text-white/45 transition hover:text-[#22c55e]">← Back</Link>
        </div>
      </div>
    </div>
  );
}

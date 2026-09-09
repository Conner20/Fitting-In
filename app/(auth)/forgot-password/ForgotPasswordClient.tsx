'use client';

import { useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const schema = z.object({
    email: z.string().email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;
type SubmitState = 'idle' | 'loading' | 'sent';

export default function ForgotPasswordClient() {
    const [status, setStatus] = useState<SubmitState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: '' },
    });

    const onSubmit = async (values: FormValues) => {
        setStatus('loading');
        setErrorMessage(null);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) throw new Error('Failed');

            setStatus('sent');
            form.reset();
        } catch (error) {
            console.error(error);
            setStatus('idle');
            setErrorMessage('Unable to send a reset link right now. Please try again in a moment.');
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#070907] px-4 py-10 text-white">
            <div className="w-full max-w-sm space-y-6 rounded-3xl border border-white/10 bg-[#111411] p-6 shadow-2xl shadow-black/40">
                <div className="space-y-1 text-center">
                    <h1 className="text-3xl font-semibold text-white">Forgot password</h1>
                    <p className="text-sm text-white/50">
                        Enter the email linked to your account and we&apos;ll send a reset link.
                    </p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="you@example.com"
                                            className="border border-white/10 bg-white/[.06] text-white placeholder:text-white/35 focus-visible:border-[#22c55e] focus-visible:ring-[#22c55e]/20"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {errorMessage && (
                            <Alert variant="destructive">
                                <AlertTitle>Unable to send email</AlertTitle>
                                <AlertDescription className="text-black">
                                    {errorMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        {status === 'sent' && (
                            <Alert className="border-green-200 bg-green-50 text-green-800">
                                <AlertTitle>Check your inbox</AlertTitle>
                                <AlertDescription className="text-green-700">
                                    If an account exists for that email, we just sent a reset link.
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            disabled={status === 'loading'}
                            className="auth-primary-action w-full bg-[#22c55e] font-bold text-black hover:bg-[#19a94e]"
                        >
                            {status === 'loading' ? 'Sending…' : 'Send reset link'}
                        </Button>
                    </form>
                </Form>

                <div className="text-center">
                    <Link
                        href="/log-in"
                        className="text-sm text-white/45 transition hover:text-[#22c55e]"
                    >
                        ← Back to log in
                    </Link>
                </div>
            </div>
        </div>
    );
}

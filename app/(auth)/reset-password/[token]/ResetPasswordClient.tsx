'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';

const schema = z
    .object({
        password: z.string().min(8, 'Password must be at least 8 characters long'),
        confirmPassword: z.string().min(8, 'Confirm your password'),
    })
    .refine((values) => values.password === values.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Passwords do not match',
    });

const inputClass =
    'border border-white/10 bg-white/[.06] text-white placeholder:text-white/35 focus-visible:border-[#22c55e] focus-visible:ring-[#22c55e]/20';

type FormValues = z.infer<typeof schema>;
type PageState = 'checking' | 'invalid' | 'valid' | 'success';

export default function ResetPasswordClient() {
    const params = useParams<{ token?: string }>();
    const token = params?.token;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [pageState, setPageState] = useState<PageState>('checking');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { password: '', confirmPassword: '' },
    });

    useEffect(() => {
        if (!token) {
            setPageState('invalid');
            return;
        }

        let isMounted = true;
        const encodedToken = encodeURIComponent(token);

        const verifyToken = async () => {
            try {
                const res = await fetch(`/api/auth/reset-password?token=${encodedToken}`, {
                    method: 'GET',
                    cache: 'no-store',
                });
                if (!res.ok) throw new Error('Invalid token');
                if (isMounted) {
                    setPageState('valid');
                }
            } catch (error) {
                console.error(error);
                if (isMounted) {
                    setPageState('invalid');
                }
            }
        };

        verifyToken();

        return () => {
            isMounted = false;
        };
    }, [token]);

    const onSubmit = async (values: FormValues) => {
        setLoading(true);
        setErrorMessage(null);
        let invalidDueToResponse = false;
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: values.password }),
            });
            if (!res.ok) {
                if (res.status === 400) {
                    setPageState('invalid');
                    invalidDueToResponse = true;
                }
                throw new Error('Failed');
            }

            toast('Password updated', {
                description: 'You can now log in with your new password.',
            });
            setPageState('success');
            router.prefetch('/log-in');
        } catch (error) {
            console.error(error);
            const toastMessage = invalidDueToResponse ? 'Link invalid or expired' : 'Unable to update password';
            const toastDescription = invalidDueToResponse
                ? 'Please request a new password reset link.'
                : 'Please try again in a moment.';
            toast(toastMessage, { description: toastDescription });
            const fallbackMessage = invalidDueToResponse
                ? 'This reset link is invalid or has expired. Request a new one to continue.'
                : 'Unable to update your password. Please try again.';
            setErrorMessage(fallbackMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#070907] px-4 py-10 text-white">
            <div className="w-full max-w-sm space-y-6 rounded-3xl border border-white/10 bg-[#111411] p-6 shadow-2xl shadow-black/40">
                <div className="space-y-1 text-center">
                    <h1 className="text-3xl font-semibold text-white">Reset password</h1>
                    <p className="text-sm text-white/50">Choose a new password to secure your account.</p>
                </div>

                {pageState === 'checking' && (
                    <div className="flex flex-col items-center gap-2 text-zinc-500">
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                        <p>Verifying your reset link…</p>
                    </div>
                )}

                {pageState === 'invalid' && (
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-red-600">
                            This reset link is invalid or has expired. Request a new link to continue.
                        </p>
                        <Link href="/forgot-password">
                            <Button type="button" className="auth-primary-action w-full bg-[#22c55e] font-bold text-black hover:bg-[#19a94e]">
                                Request another reset link
                            </Button>
                        </Link>
                    </div>
                )}

                {pageState === 'success' && (
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-zinc-600">
                            Your password has been updated. Use your new password the next time you log in.
                        </p>
                        <Link href="/log-in">
                            <Button type="button" className="auth-primary-action w-full bg-[#22c55e] font-bold text-black hover:bg-[#19a94e]">
                                Go to log in
                            </Button>
                        </Link>
                    </div>
                )}

                {pageState === 'valid' && (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">New password</FormLabel>
                                        <FormControl>
                                            <PasswordInput
                                                placeholder="********"
                                                minLength={8}
                                                className={inputClass}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Confirm password</FormLabel>
                                        <FormControl>
                                            <PasswordInput
                                                placeholder="********"
                                                minLength={8}
                                                className={inputClass}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

                            <Button
                                type="submit"
                                disabled={loading}
                                className="auth-primary-action w-full bg-[#22c55e] font-bold text-black hover:bg-[#19a94e]"
                            >
                                {loading ? 'Updating…' : 'Update password'}
                            </Button>
                            <div className="text-center text-sm">
                                <Link href="/log-in" className="text-white/45 transition hover:text-[#22c55e]">
                                    Back to log in
                                </Link>
                            </div>
                        </form>
                    </Form>
                )}
            </div>
        </div>
    );
}

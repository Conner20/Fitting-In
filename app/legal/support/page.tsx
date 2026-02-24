'use client';

import LandingHeader from '@/components/LandingHeader';
import LandingFooter from '@/components/LandingFooter';
import LegalTabs from '@/components/LegalTabs';

export default function SupportPage() {
    return (
        <>
            <LandingHeader />
            <main className="min-h-screen w-full bg-neutral-50 px-4 py-16 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
                <div className="mx-auto max-w-3xl space-y-8">
                    <header className="space-y-3">
                        <h1 className="text-3xl font-semibold sm:text-4xl">Support</h1>
                        <p className="text-base text-neutral-600 dark:text-neutral-300">
                            Need help with Fitting In? Contact support for account issues, bugs, reporting content, or general questions.
                        </p>
                    </header>

                    <LegalTabs />

                    <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-6 text-sm leading-relaxed text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Contact Support</h2>
                            <p>
                                <strong>Email:</strong>{' '}
                                <a
                                    href="mailto:contactfittingin@gmail.com"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    contactfittingin@gmail.com
                                </a>
                            </p>
                            <p>
                                We currently provide support by email only. If you reach out, please include as much detail as possible so we
                                can help faster.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">What We Can Help With</h2>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>Account access issues (login problems, password reset trouble, email verification issues)</li>
                                <li>Profile issues (trainer/gym/trainee profile setup or updates)</li>
                                <li>Bugs, errors, broken pages, or features not working as expected</li>
                                <li>Messaging issues or unexpected behavior</li>
                                <li>Reporting spam, harassment, fake accounts, or impersonation</li>
                                <li>Questions about posts, comments, reviews, ratings, or moderation decisions</li>
                                <li>Privacy or data-related questions</li>
                                <li>General product feedback or feature requests</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                Before You Email (Helpful Info to Include)
                            </h2>
                            <p>To help us troubleshoot quickly, include any relevant details such as:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>the email address associated with your account,</li>
                                <li>your username (if applicable),</li>
                                <li>what happened and what you expected to happen,</li>
                                <li>the page/feature you were using,</li>
                                <li>the approximate time the issue occurred,</li>
                                <li>any error message you saw, and</li>
                                <li>a screenshot or screen recording (if available).</li>
                            </ul>
                            <p>
                                Please do not send highly sensitive information (such as passwords) by email. We will never ask for your
                                password.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Response Time</h2>
                            <p>
                                We aim to respond to support emails within <strong>1–3 business days</strong>.
                            </p>
                            <p>
                                Response times may be longer during weekends, holidays, or periods of high volume. We appreciate your
                                patience while the platform is growing.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                Reporting Safety or Abuse Issues
                            </h2>
                            <p>
                                If you need to report harassment, impersonation, spam, or abusive content/behavior, please email support and
                                include:
                            </p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>the username(s) involved,</li>
                                <li>links to the content/profile (if possible),</li>
                                <li>screenshots, and</li>
                                <li>a short description of what happened.</li>
                            </ul>
                            <p>
                                We review reports and may take action under our Terms of Service, including content removal or account
                                restrictions.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                Account and Privacy Requests
                            </h2>
                            <p>
                                For account or privacy-related requests (such as correcting account information or requesting deletion), email{' '}
                                <a
                                    href="mailto:contactfittingin@gmail.com"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    contactfittingin@gmail.com
                                </a>{' '}
                                and include enough information for us to verify and process your request.
                            </p>
                            <p>
                                For more details on how information is handled, please review our Privacy Policy and Terms of Service.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Feature Requests & Feedback</h2>
                            <p>
                                We welcome feedback as Fitting In grows. If you have an idea for a new feature or improvement, send us a note
                                with:
                            </p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>the problem you’re trying to solve,</li>
                                <li>who the feature would help (trainee, trainer, or gym), and</li>
                                <li>how you’d expect it to work.</li>
                            </ul>
                            <p>
                                While we can’t promise every request will be implemented, user feedback helps shape future updates.
                            </p>
                        </div>
                    </section>
                </div>
            </main>
            <LandingFooter />
        </>
    );
}
